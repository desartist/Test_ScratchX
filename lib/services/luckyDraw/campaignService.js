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
import { validatePrizeAllocation } from '@/lib/luckyDraw/prizeModes';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { RECURRENCE_FREQUENCIES, REVEAL_MODES, SCHEDULE_TYPES, TRIGGER_MODES } from '@/lib/luckyDraw/constants';
import { normalizePrizeCategories, validatePrizeCategories } from '@/lib/luckyDraw/prizeCategories';
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

function parseDates(input) {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ValidationError('Enter valid start and end dates');
  }
  if (endDate <= startDate) throw new ValidationError('End date must be after start date');

  // Winners are revealed when entries close unless the owner picks a later reveal date.
  const revealDate = input.revealDate ? new Date(input.revealDate) : new Date(endDate);
  if (Number.isNaN(revealDate.getTime())) throw new ValidationError('Enter a valid reveal date');
  if (revealDate < endDate) throw new ValidationError('The reveal date must be on or after the date entries close');

  return { startDate, endDate, revealDate };
}

async function loadStores(merchantId, input) {
  const storeIds = [...new Set((input.storeIds || []).filter((id) => mongoose.isValidObjectId(id)).map(String))];
  if (storeIds.length === 0) throw new ValidationError('Select at least one store');
  const stores = await Store.find({ _id: { $in: storeIds }, merchant_id: merchantId, status: 'active' }).lean();
  if (stores.length !== storeIds.length) throw new ValidationError('One or more selected stores are not available');
  // Customers enter by QR only at the store, so every store needs a location for the check.
  const noLocation = stores.find((s) => !s.latitude || !s.longitude);
  if (noLocation) throw new ValidationError(`${noLocation.store_name} has no location set. Add one before using it.`);
  return stores;
}

export async function createCampaign(merchantId, input) {
  await assertPlanAllows(merchantId);

  const name = String(input.name || '').trim();
  if (name.length < 3) throw new ValidationError('Give the Lucky Draw a name of at least 3 characters');

  const revealMode = input.revealMode ?? 'instant';
  if (!REVEAL_MODES.includes(revealMode)) {
    throw new ValidationError('Choose how winners are shown: all at once, or revealed live');
  }

  const { startDate, endDate, revealDate } = parseDates(input);

  const prizes = Array.isArray(input.prizes) ? input.prizes : [];
  const prizeError = validatePrizeCategories(prizes);
  if (prizeError) throw new ValidationError(prizeError);

  const tierError = validateEntryTiers(input.entryTiers);
  if (tierError) throw new ValidationError(tierError);

  // Ranges are stored sorted by minimum; a prize's range numbers refer to that sorted order.
  const entryTiers = [...input.entryTiers]
    .sort((a, b) => a.minAmount - b.minAmount)
    .map(({ minAmount, maxAmount = null, entriesGranted }) => ({ minAmount, maxAmount, entriesGranted }));

  const prizeMode = input.prizeMode ?? 'shared';
  const allocationError = validatePrizeAllocation(prizeMode, prizes, entryTiers.length);
  if (allocationError) throw new ValidationError(allocationError);

  const cap = input.maxEntriesPerCustomerPerPeriod ?? null;
  if (cap != null && !(Number.isInteger(cap) && cap >= 1)) {
    throw new ValidationError('The entry limit per customer must be a whole number of at least 1');
  }

  // A live reveal is one draw on the reveal date that the owner starts in front of customers.
  const drawConfig = revealMode === 'live' ? { scheduleType: 'end_of_campaign', triggerMode: 'manual' } : parseDraw(input);

  const stores = await loadStores(merchantId, input);

  const created = await LuckyDrawCampaign.create({
    merchantId,
    name,
    description: input.description,
    revealMode,
    startDate,
    endDate,
    revealDate,
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
    entryTiers,
    prizeMode,
    prizeTiers: normalizePrizeCategories(prizes).map((p) => ({
      ...p,
      tierIndexes: prizeMode === 'shared' ? [] : p.tierIndexes,
    })),
    maxEntriesPerCustomerPerPeriod: cap,
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
  // Prize pictures can be up to 200 KB each; the list never shows them, so they are left out.
  const campaigns = await LuckyDrawCampaign.find({ merchantId }).select('-prizeTiers.imageUrl').sort({ createdAt: -1 }).lean();
  const ids = campaigns.map((c) => c._id);
  const [draws, revealing] = await Promise.all([
    LuckyDraw.find({ campaignId: { $in: ids }, status: 'scheduled' }).lean(),
    // A live reveal the owner has started but not finished.
    LuckyDraw.distinct('campaignId', {
      campaignId: { $in: ids },
      status: 'completed',
      'reveal.startedAt': { $exists: true },
      'reveal.completedAt': { $exists: false },
    }),
  ]);
  const nextByCampaign = new Map(draws.map((d) => [String(d.campaignId), d.drawDate]));
  const revealingIds = new Set(revealing.map(String));

  const [entryRows, unclaimedRows] = await Promise.all([
    // Every entry the lucky draw received, so a finished draw still shows how many took part.
    LuckyDrawEntry.aggregate([
      { $match: { campaignId: { $in: ids } } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]),
    LuckyDrawWinner.aggregate([
      { $match: { campaignId: { $in: ids }, status: { $in: ['pending', 'notified'] }, hiddenUntilReveal: { $ne: true } } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]),
  ]);
  const entries = new Map(entryRows.map((r) => [String(r._id), r.count]));
  const unclaimed = new Map(unclaimedRows.map((r) => [String(r._id), r.count]));

  return campaigns.map((c) => ({
    ...c,
    nextDrawDate: nextByCampaign.get(String(c._id)) || null,
    entryCount: entries.get(String(c._id)) || 0,
    unclaimedCount: unclaimed.get(String(c._id)) || 0,
    revealInProgress: revealingIds.has(String(c._id)),
  }));
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
    // During a live reveal the owner sees each winner as it is revealed, like everyone else.
    LuckyDrawWinner.find({ campaignId, hiddenUntilReveal: { $ne: true } }).sort({ createdAt: -1, rank: 1 }).limit(200).lean(),
  ]);

  // How many people took part in the latest finished draw, for the stats once the draw has run.
  if (pastDraws[0]) {
    pastDraws[0].customerCount = (await LuckyDrawEntry.distinct('customerPhone', { drawId: pastDraws[0]._id })).length;
  }

  return { campaign, openDraw, pastDraws, winners };
}

/** A merchant's own campaign (lean). Others' campaigns look like they do not exist. */
export async function getOwnedCampaign(merchantId, campaignId) {
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findOne({ _id: campaignId, merchantId }).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');
  return campaign;
}
