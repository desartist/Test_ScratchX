import Campaign from '@/models/campaignModel';
import Store from '@/models/storeModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { DRAW_TYPES } from '@/lib/luckyDraw/constants';
import { normalizePrizeLevels, validatePrizeLevels } from '@/lib/luckyDraw/prizeCategories';
import { storeHasLocation, storeProblem } from '@/lib/luckyDraw/storeRules';
import { ensureOpenDraw } from './openDraw';

const TRANSITIONS = { draft: ['active'], paused: ['active'], active: ['paused'] };

async function assertPlanAllows(merchantId) {
  const access = await checkPlanAccess({ ownerType: 'merchant', ownerId: merchantId }, 'canUseLuckyDraw');
  if (access.allowed) return access.plan;

  // No linked plan: go by planType, as the rest of the app does (resolvePlan in
  // subscriptionValidationService). Lucky Draw is a Smart feature; no plan means no campaign cap.
  if (access.subscription && !access.plan) {
    if (access.subscription.planType === 'SMART') return null;
    throw new AuthorizationError('Lucky Draw is not available on your plan');
  }
  throw new AuthorizationError(access.reason || 'Lucky Draw is not available on your plan');
}

async function countActiveCampaigns(merchantId) {
  const [scratch, luckyDraw] = await Promise.all([
    Campaign.countDocuments({ merchantId, status: 'active' }),
    LuckyDrawCampaign.countDocuments({ merchantId, status: 'active' }),
  ]);
  return scratch + luckyDraw;
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

/** Every active store of the merchant, as the snapshot a draw keeps. Throws when they cannot run this draw type. */
async function activeStoreSnapshots(merchantId, drawType) {
  const stores = await Store.find({ merchant_id: merchantId, status: 'active' }).sort({ store_name: 1 }).lean();
  const problem = storeProblem(drawType, stores);
  if (problem) throw new ValidationError(problem);
  return stores.map((s) => ({
    storeId: s._id,
    storeName: s.store_name,
    storeCode: s.store_code,
    address: s.address,
    city: s.city,
    state: s.state,
    pincode: s.pincode,
    latitude: storeHasLocation(s) ? s.latitude : null,
    longitude: storeHasLocation(s) ? s.longitude : null,
    status: 'active',
  }));
}

function parseMinBill(value) {
  if (!Number.isInteger(value) || value < 0) throw new ValidationError('Enter the minimum bill amount in whole rupees');
  return value;
}

export async function createCampaign(merchantId, input) {
  await assertPlanAllows(merchantId);

  const name = String(input.name || '').trim();
  if (name.length < 3) throw new ValidationError('Give the Lucky Draw a name of at least 3 characters');

  const drawType = input.drawType;
  if (!DRAW_TYPES.includes(drawType)) throw new ValidationError('Choose how the draw runs: physical, live online or digital');

  const { startDate, endDate, revealDate } = parseDates(input);
  const minBillAmount = parseMinBill(input.minBillAmount);

  const prizes = Array.isArray(input.prizes) ? input.prizes : [];
  const prizeError = validatePrizeLevels(prizes);
  if (prizeError) throw new ValidationError(prizeError);

  const assignedStores = await activeStoreSnapshots(merchantId, drawType);

  const created = await LuckyDrawCampaign.create({
    merchantId,
    name,
    description: input.description,
    drawType,
    startDate,
    endDate,
    revealDate,
    assignedStores,
    minBillAmount,
    prizeTiers: normalizePrizeLevels(prizes),
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

    // A draft runs at every store that is active when it is published, including stores added since it was saved.
    if (campaign.status === 'draft') campaign.assignedStores = await activeStoreSnapshots(merchantId, campaign.drawType);

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
