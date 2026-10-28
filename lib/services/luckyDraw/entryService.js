import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import {
  ALLOWED_RADIUS_METERS,
  CONFIRMATION_SMS_WINDOW_MS,
  DATE_CHANGE_NOTICE,
  DUPLICATE_WINDOW_MS,
  ENTRY_SOURCES,
} from '@/lib/luckyDraw/constants';
import { isEmail } from '@/lib/luckyDraw/entryForm';
import { findNearestStore } from './locationCheck';
import { ensureOpenDraw, previousDrawDate } from './openDraw';
import { sendSms, sendEmail, messages } from './notifier';

const MOBILE = /^[0-9]{10}$/;
const rupees = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

async function sumEntries(drawId, customerPhone) {
  const [row] = await LuckyDrawEntry.aggregate([
    { $match: { drawId, customerPhone } },
    { $group: { _id: null, total: { $sum: '$entriesGranted' } } },
  ]);
  return row?.total || 0;
}

/**
 * One entry for one bill. source 'qr': the customer scanned the store's QR code (geofenced unless
 * skipLocationCheck); the QR form doesn't ask for the bill, so billAmount is optional there.
 * source 'staff': a staff member typed it in at the counter at `storeId`, bill amount included.
 * Every bill of at least the campaign's minimum earns exactly one numbered entry.
 */
export async function createEntry(input, now = new Date()) {
  const {
    campaignId,
    customerName,
    customerMobile,
    customerEmail,
    billAmount = null,
    consent,
    latitude,
    longitude,
    source = 'qr',
    storeId = null,
    addedByAccountId = null,
    skipLocationCheck = false,
  } = input;

  if (!ENTRY_SOURCES.includes(source)) throw new ValidationError('Unknown entry source');
  const name = String(customerName || '').trim();
  if (name.length < 2 || name.length > 80) {
    throw new ValidationError(source === 'staff' ? "Enter the customer's name (2 to 80 characters)" : 'Enter your name (2 to 80 characters)');
  }
  if (!MOBILE.test(String(customerMobile || ''))) throw new ValidationError('WhatsApp number must be exactly 10 digits');
  const email = String(customerEmail ?? '').trim().toLowerCase();
  if (!isEmail(email)) {
    throw new ValidationError(source === 'staff' ? "Enter the customer's email address" : 'Enter a valid email address');
  }
  const billGiven = billAmount !== null && billAmount !== undefined;
  if (source === 'staff' && !billGiven) throw new ValidationError('Enter a valid bill amount');
  if (billGiven && (typeof billAmount !== 'number' || !Number.isFinite(billAmount) || billAmount < 0)) {
    throw new ValidationError('Enter a valid bill amount');
  }
  if (consent !== true) {
    throw new ValidationError(source === 'staff' ? 'Confirm the customer agreed to get messages about this draw' : 'Please accept the terms to enter the draw');
  }

  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findById(campaignId).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');
  if (campaign.status !== 'active') throw new ConflictError('This Lucky Draw is not open for entries right now');
  if (now < campaign.startDate) throw new ConflictError('This Lucky Draw has not started yet');
  if (now > campaign.endDate) throw new ConflictError('This Lucky Draw has ended');
  if (source === 'qr' && campaign.drawType === 'physical') {
    throw new ConflictError('This draw takes entries at the store counter. Please ask the staff to add your entry.');
  }
  if (source === 'staff' && campaign.drawType === 'digital') {
    throw new ConflictError('This draw only takes entries by QR code. Ask the customer to scan the QR code.');
  }
  if (billGiven && billAmount < campaign.minBillAmount) {
    throw new ValidationError(`Bills of ${rupees(campaign.minBillAmount)} or more can enter this draw`);
  }

  const activeStores = campaign.assignedStores.filter((s) => s.status === 'active');
  let store;
  let distanceMeters = null;
  if (source === 'staff') {
    store = activeStores.find((s) => String(s.storeId) === String(storeId));
    if (!store) throw new ValidationError('Choose one of the stores in this draw');
  } else if (skipLocationCheck) {
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

  const draw = await ensureOpenDraw(campaign, now);

  // Same number and the same bill (or, for QR entries, any entry) within a minute is a double submit.
  const duplicate = await LuckyDrawEntry.findOne({
    drawId: draw._id,
    customerPhone: customerMobile,
    billAmount: billGiven ? billAmount : null,
    createdAt: { $gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
  }).lean();
  if (duplicate) {
    throw new ConflictError('This bill was just submitted. Please wait a minute before submitting again.');
  }

  // $inc is atomic, so two entries saved at the same moment never share a number.
  const counter = await LuckyDrawCampaign.findOneAndUpdate(
    { _id: campaign._id },
    { $inc: { entryCounter: 1 } },
    { new: true, projection: { entryCounter: 1 } },
  ).lean();

  const entry = await LuckyDrawEntry.create({
    campaignId: campaign._id,
    drawId: draw._id,
    storeId: store.storeId,
    customerName: name,
    customerPhone: customerMobile,
    customerEmail: email,
    consent: true,
    billAmount: billGiven ? billAmount : null,
    entriesGranted: 1,
    entryNumber: counter.entryCounter,
    source,
    addedByAccountId: source === 'staff' ? addedByAccountId : null,
    distanceMeters,
    customerLatitude: source === 'qr' && typeof latitude === 'number' ? latitude : null,
    customerLongitude: source === 'qr' && typeof longitude === 'number' ? longitude : null,
  });

  return {
    entry: entry.toObject(),
    entryNumber: entry.entryNumber,
    entriesGranted: 1,
    totalEntries: await sumEntries(draw._id, customerMobile),
    drawDate: draw.drawDate,
    drawId: draw._id,
    campaignName: campaign.name,
    storeName: store.storeName,
  };
}

/**
 * True when this phone has had at most one entry in the last 10 minutes
 * (the one just created). Stops an entry form being used to send
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

/**
 * Texts and emails the entry confirmation (at most once per number per 10 minutes). Never throws:
 * the entry stands. Returns { smsSent, emailSent }.
 */
export async function confirmEntry({ drawId, customerPhone, customerEmail = null, campaignName, entryNumber = null, drawDate, now = new Date() }) {
  const result = { smsSent: false, emailSent: false };
  try {
    if (!(await shouldSendConfirmation({ drawId, customerPhone, now }))) return result;
  } catch (error) {
    console.error('[LuckyDraw] confirmation check failed', error.message);
    return result;
  }

  if (customerEmail) {
    result.emailSent = (await sendEmail(customerEmail, 'luckyDrawEntry', { campaignName, entryNumber, drawDate })).success === true;
  }
  try {
    await sendSms(customerPhone, messages.entryConfirmation({ campaignName, entries: 1, drawDate }));
    result.smsSent = true;
  } catch (error) {
    console.error('[LuckyDraw] confirmation SMS failed', error.message);
  }
  return result;
}

/** confirmEntry, answering only whether the SMS went out. */
export async function sendEntryConfirmation(args) {
  return (await confirmEntry(args)).smsSent;
}

export async function getEntryStatus({ campaignId, customerMobile }) {
  if (!MOBILE.test(String(customerMobile || ''))) throw new ValidationError('Mobile number must be exactly 10 digits');
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findById(campaignId).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');

  const [draw, revealing] = await Promise.all([
    LuckyDraw.findOne({ campaignId, status: 'scheduled' }).lean(),
    // A live reveal that has started but not finished: some winners are still hidden.
    LuckyDraw.exists({ campaignId, 'reveal.startedAt': { $exists: true }, 'reveal.completedAt': { $exists: false } }),
  ]);
  // A campaign has one draw, so its entries are this number's entries, before and after the draw.
  const totalEntries = await LuckyDrawEntry.countDocuments({ campaignId: campaign._id, customerPhone: customerMobile });

  // Live reveal winners are not told before their prize is revealed on the reveal page.
  const wins = await LuckyDrawWinner.find({ campaignId, customerPhone: customerMobile, hiddenUntilReveal: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();

  return {
    campaignName: campaign.name,
    campaignStatus: campaign.status,
    drawStatus: draw?.status ?? null,
    drawDate: draw?.drawDate ?? null,
    previousDrawDate: previousDrawDate(draw),
    totalEntries,
    revealInProgress: !!revealing,
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
