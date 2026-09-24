import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { resolveTier } from '@/lib/luckyDraw/entryTiers';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import {
  ALLOWED_RADIUS_METERS,
  CONFIRMATION_SMS_WINDOW_MS,
  DATE_CHANGE_NOTICE,
  DUPLICATE_WINDOW_MS,
} from '@/lib/luckyDraw/constants';
import { findNearestStore } from './locationCheck';
import { ensureOpenDraw } from './openDraw';

const MOBILE = /^[0-9]{10}$/;

async function sumEntries(drawId, customerPhone) {
  const [row] = await LuckyDrawEntry.aggregate([
    { $match: { drawId, customerPhone } },
    { $group: { _id: null, total: { $sum: '$entriesGranted' } } },
  ]);
  return row?.total || 0;
}

export async function createEntry(input, now = new Date()) {
  const {
    campaignId,
    customerName,
    customerMobile,
    billAmount,
    consent,
    latitude,
    longitude,
    storeId = null,
    skipLocationCheck = false,
  } = input;

  const name = String(customerName || '').trim();
  if (name.length < 2 || name.length > 80) throw new ValidationError('Enter your name (2 to 80 characters)');
  if (!MOBILE.test(String(customerMobile || ''))) throw new ValidationError('Mobile number must be exactly 10 digits');
  if (typeof billAmount !== 'number' || !Number.isFinite(billAmount) || billAmount < 0) {
    throw new ValidationError('Enter a valid bill amount');
  }
  if (consent !== true) throw new ValidationError('Please accept the terms to enter the draw');

  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findById(campaignId).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');
  if (campaign.status !== 'active') throw new ConflictError('This Lucky Draw is not open for entries right now');
  if (now < campaign.startDate) throw new ConflictError('This Lucky Draw has not started yet');
  if (now > campaign.endDate) throw new ConflictError('This Lucky Draw has ended');

  const activeStores = campaign.assignedStores.filter((s) => s.status === 'active');
  let store;
  let distanceMeters = null;
  if (skipLocationCheck) {
    store = activeStores.find((s) => String(s.storeId) === String(storeId)) || activeStores[0];
  } else {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new ValidationError('Location is required to enter this draw');
    }
    const nearest = findNearestStore(activeStores, latitude, longitude);
    if (!nearest || nearest.distance > ALLOWED_RADIUS_METERS) {
      throw new ValidationError('This QR code is not valid at your current location. Please visit a participating store.');
    }
    store = nearest.store;
    distanceMeters = nearest.distance;
  }
  if (!store) throw new ValidationError('No participating store is available');

  const tier = resolveTier(campaign.entryTiers, billAmount);
  const earned = tier?.entriesGranted ?? 0;
  if (!tier) {
    const minAmount = Math.min(...campaign.entryTiers.map((t) => t.minAmount));
    if (billAmount < minAmount) {
      throw new ValidationError(`The minimum bill amount to enter this draw is ₹${minAmount}`);
    }
    throw new ValidationError('This bill amount does not qualify for an entry');
  }

  const draw = await ensureOpenDraw(campaign, now);

  const duplicate = await LuckyDrawEntry.findOne({
    drawId: draw._id,
    customerPhone: customerMobile,
    billAmount,
    createdAt: { $gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
  }).lean();
  if (duplicate) {
    throw new ConflictError('This bill was just submitted. Please wait a minute before submitting again.');
  }

  const alreadyHeld = await sumEntries(draw._id, customerMobile);
  let granted = earned;
  const cap = campaign.maxEntriesPerCustomerPerPeriod;
  if (cap != null) {
    const remaining = cap - alreadyHeld;
    if (remaining <= 0) throw new ConflictError(`You have reached the limit of ${cap} entries for this draw`);
    granted = Math.min(earned, remaining);
  }

  const entry = await LuckyDrawEntry.create({
    campaignId: campaign._id,
    drawId: draw._id,
    storeId: store.storeId,
    customerName: name,
    customerPhone: customerMobile,
    consent: true,
    billAmount,
    entriesGranted: granted,
    tierIndex: tier.index,
    distanceMeters,
    customerLatitude: typeof latitude === 'number' ? latitude : null,
    customerLongitude: typeof longitude === 'number' ? longitude : null,
  });

  return {
    entry: entry.toObject(),
    entriesGranted: granted,
    totalEntries: alreadyHeld + granted,
    capped: granted < earned,
    drawDate: draw.drawDate,
    drawId: draw._id,
    campaignName: campaign.name,
  };
}

/**
 * True when this phone has had at most one entry in the last 10 minutes
 * (the one just created). Stops the public endpoint being used to send
 * repeated SMS to somebody else's number.
 */
export async function shouldSendConfirmation({ drawId, customerPhone, now = new Date() }) {
  const recent = await LuckyDrawEntry.countDocuments({
    drawId,
    customerPhone,
    createdAt: { $gte: new Date(now.getTime() - CONFIRMATION_SMS_WINDOW_MS) },
  });
  return recent <= 1;
}

export async function getEntryStatus({ campaignId, customerMobile }) {
  if (!MOBILE.test(String(customerMobile || ''))) throw new ValidationError('Mobile number must be exactly 10 digits');
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findById(campaignId).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');

  const draw = await LuckyDraw.findOne({ campaignId, status: 'scheduled' }).lean();
  const totalEntries = draw ? await sumEntries(draw._id, customerMobile) : 0;
  const lastChange = draw?.dateHistory?.length ? draw.dateHistory[draw.dateHistory.length - 1] : null;

  const wins = await LuckyDrawWinner.find({ campaignId, customerPhone: customerMobile })
    .sort({ createdAt: -1 })
    .lean();

  return {
    campaignName: campaign.name,
    campaignStatus: campaign.status,
    drawStatus: draw?.status ?? null,
    drawDate: draw?.drawDate ?? null,
    previousDrawDate: lastChange?.previousDate ?? null,
    totalEntries,
    notice: DATE_CHANGE_NOTICE,
    // Claim codes are deliberately not returned: anyone who knows a phone number can call this.
    wins: wins.map((w) => ({
      rank: w.rank,
      prizeDescription: w.prizeDescription,
      status: w.status,
      expiresAt: w.expiresAt,
    })),
  };
}
