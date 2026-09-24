import mongoose from 'mongoose';
import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { validateEntryTiers } from '@/lib/luckyDraw/entryTiers';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { RECURRENCE_FREQUENCIES, SCHEDULE_TYPES, TRIGGER_MODES } from '@/lib/luckyDraw/constants';
import { ensureOpenDraw } from './openDraw';

const TRANSITIONS = { draft: ['active'], paused: ['active'], active: ['paused'] };

async function assertPlanAllows(merchantId) {
  const access = await checkPlanAccess({ ownerType: 'merchant', ownerId: merchantId }, 'canUseLuckyDraw');
  if (!access.allowed) {
    throw new AuthorizationError(access.reason || 'Lucky Draw is not available on your plan');
  }
  return access.plan;
}

async function countActiveCampaigns(merchantId) {
  const [scratch, luckyDraw] = await Promise.all([
    Campaign.countDocuments({ merchantId, status: 'active' }),
    LuckyDrawCampaign.countDocuments({ merchantId, status: 'active' }),
  ]);
  return scratch + luckyDraw;
}

function parseDraw(input) {
  const scheduleType = input.scheduleType;
  if (!SCHEDULE_TYPES.includes(scheduleType)) {
    throw new ValidationError('Choose when the draw happens: at the end of the campaign or on a schedule');
  }

  const triggerMode = input.triggerMode || 'automatic';
  if (!TRIGGER_MODES.includes(triggerMode)) {
    throw new ValidationError('Choose a trigger mode: automatic or manual');
  }

  const drawConfig = { scheduleType, triggerMode };
  if (scheduleType === 'recurring') {
    const { frequency, time, dayOfWeek } = input.recurrence || {};
    if (!RECURRENCE_FREQUENCIES.includes(frequency)) {
      throw new ValidationError('Recurring draws need a frequency: daily or weekly');
    }
    if (frequency === 'weekly' && !(Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6)) {
      throw new ValidationError('Weekly draws need a weekday');
    }
    drawConfig.recurrence = { frequency, time: time || '18:00', dayOfWeek: frequency === 'weekly' ? dayOfWeek : null };
  }
  return drawConfig;
}

export async function createCampaign(merchantId, input) {
  await assertPlanAllows(merchantId);

  const name = String(input.name || '').trim();
  if (name.length < 3) throw new ValidationError('Give the Lucky Draw a name of at least 3 characters');

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ValidationError('Enter valid start and end dates');
  }
  if (endDate <= startDate) throw new ValidationError('End date must be after start date');

  const tierError = validateEntryTiers(input.entryTiers);
  if (tierError) throw new ValidationError(tierError);

  const prizes = Array.isArray(input.prizes) ? input.prizes : [];
  if (prizes.length === 0 || prizes.some((p) => !String(p?.prizeDescription || '').trim())) {
    throw new ValidationError('Add at least one prize, each with a description');
  }

  const cap = input.maxEntriesPerCustomerPerPeriod;
  if (cap != null && !(Number.isInteger(cap) && cap >= 1)) {
    throw new ValidationError('The entry limit per customer must be a whole number of at least 1');
  }

  const drawConfig = parseDraw(input);

  const storeIds = [...new Set((input.storeIds || []).filter((id) => mongoose.isValidObjectId(id)).map(String))];
  if (storeIds.length === 0) throw new ValidationError('Select at least one store');
  const stores = await Store.find({ _id: { $in: storeIds }, merchant_id: merchantId, status: 'active' }).lean();
  if (stores.length !== storeIds.length) throw new ValidationError('One or more selected stores are not available');
  const noLocation = stores.find((s) => !s.latitude || !s.longitude);
  if (noLocation) throw new ValidationError(`${noLocation.store_name} has no location set. Add one before using it.`);

  const created = await LuckyDrawCampaign.create({
    merchantId,
    name,
    description: input.description,
    startDate,
    endDate,
    assignedStores: stores.map((s) => ({
      storeId: s._id,
      storeName: s.store_name,
      storeCode: s.store_code,
      address: s.address,
      city: s.city,
      state: s.state,
      pincode: s.pincode,
      latitude: s.latitude,
      longitude: s.longitude,
      status: 'active',
    })),
    entryTiers: input.entryTiers.map(({ minAmount, maxAmount = null, entriesGranted }) => ({
      minAmount,
      maxAmount,
      entriesGranted,
    })),
    prizeTiers: prizes.map((p, index) => ({
      rank: index + 1,
      prizeDescription: String(p.prizeDescription).trim(),
      prizeValue: Number(p.prizeValue) || 0,
    })),
    maxEntriesPerCustomerPerPeriod: cap ?? null,
    drawConfig,
    status: 'draft',
  });
  return created.toObject();
}

async function loadOwned(merchantId, campaignId) {
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findOne({ _id: campaignId, merchantId });
  if (!campaign) throw new NotFoundError('Lucky Draw not found');
  return campaign;
}

export async function setCampaignStatus(merchantId, campaignId, nextStatus, now = new Date()) {
  const campaign = await loadOwned(merchantId, campaignId);

  if (!(TRANSITIONS[campaign.status] || []).includes(nextStatus)) {
    throw new ConflictError(`A Lucky Draw that is ${campaign.status} cannot become ${nextStatus}`);
  }

  if (nextStatus === 'active') {
    const plan = await assertPlanAllows(merchantId);
    if (campaign.endDate <= now) throw new ValidationError('The end date has already passed');

    const limit = plan?.limits?.maxCampaigns;
    if (limit != null && limit !== -1) {
      const active = await countActiveCampaigns(merchantId);
      if (active >= limit) {
        throw new ConflictError(
          `Your plan allows ${limit} active campaign${limit === 1 ? '' : 's'}. Pause or end one first.`,
        );
      }
    }

    campaign.status = 'active';
    await campaign.save();
    await ensureOpenDraw(campaign.toObject(), now);
  } else {
    campaign.status = nextStatus;
    await campaign.save();
  }

  return campaign.toObject();
}

export async function listCampaigns(merchantId) {
  const campaigns = await LuckyDrawCampaign.find({ merchantId }).sort({ createdAt: -1 }).lean();
  const draws = await LuckyDraw.find({
    campaignId: { $in: campaigns.map((c) => c._id) },
    status: 'scheduled',
  }).lean();
  const nextByCampaign = new Map(draws.map((d) => [String(d.campaignId), d.drawDate]));

  return campaigns.map((c) => ({ ...c, nextDrawDate: nextByCampaign.get(String(c._id)) || null }));
}

export async function getCampaignDetail(merchantId, campaignId, now = new Date()) {
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findOne({ _id: campaignId, merchantId }).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');

  const scheduled = await LuckyDraw.findOne({ campaignId, status: 'scheduled' }).lean();
  let openDraw = null;
  if (scheduled) {
    const [entryCount, phones] = await Promise.all([
      LuckyDrawEntry.countDocuments({ drawId: scheduled._id }),
      LuckyDrawEntry.distinct('customerPhone', { drawId: scheduled._id }),
    ]);
    openDraw = { ...scheduled, entryCount, customerCount: phones.length, isDue: new Date(scheduled.drawDate) <= now };
  }

  const [pastDraws, winners] = await Promise.all([
    LuckyDraw.find({ campaignId, status: 'completed' }).sort({ executedAt: -1 }).limit(20).lean(),
    LuckyDrawWinner.find({ campaignId }).sort({ createdAt: -1, rank: 1 }).limit(200).lean(),
  ]);

  return { campaign, openDraw, pastDraws, winners };
}
