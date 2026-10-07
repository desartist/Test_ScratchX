import crypto from 'crypto';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { CLAIM_EXPIRY_DAYS, MAX_SLIP_COUNT, isManualMode } from '@/lib/luckyDraw/constants';
import { revealOrder } from '@/lib/luckyDraw/prizeCategories';
import { assertDrawOwner } from './openDraw';
import { createSeededRng } from './winnerSelection';
import { generateClaimCode } from './claimCode';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Slip numbers are shown with four digits, like the printed slips: 7 -> "0007". */
export const formatSlip = (number) => String(number).padStart(4, '0');

async function ownedSlipDraw(merchantId, drawId, mode) {
  const { draw, campaign } = await assertDrawOwner(drawId, merchantId);
  if (campaign.distributionMode !== mode) {
    throw new ConflictError(
      mode === 'manual_offline_reveal'
        ? 'Winning slips are typed in only for draws revealed in the store'
        : 'A live online reveal is only for slip draws revealed online',
    );
  }
  return { draw, campaign };
}

function assertEntriesClosed(campaign, now) {
  if (now < new Date(campaign.endDate)) {
    throw new ConflictError('Entries are still open. Winners can be picked once entries close.');
  }
}

/** The owner hands out more numbered slips. The count can only go up, so printed slips stay valid. */
export async function setSlipCount(merchantId, campaignId, count) {
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findOne({ _id: campaignId, merchantId });
  if (!campaign) throw new NotFoundError('Lucky Draw not found');
  if (!isManualMode(campaign.distributionMode)) throw new ConflictError('Only slip draws have numbered slips');
  if (campaign.status === 'ended') throw new ConflictError('This Lucky Draw has finished');

  const next = Number(count);
  if (!Number.isInteger(next) || next < 0 || next > MAX_SLIP_COUNT) {
    throw new ValidationError('Enter the number of slips handed out as a whole number');
  }
  if (next < campaign.slipCount) {
    throw new ValidationError(`Slips 0001 to ${formatSlip(campaign.slipCount)} are already out. You cannot record fewer.`);
  }

  campaign.slipCount = next;
  await campaign.save();
  return campaign.toObject();
}

/** Checks typed-in picks against the prizes and the slips handed out. Returns them cleaned. */
function validatePicks(picks, campaign) {
  if (!Array.isArray(picks)) throw new ValidationError('Send the winning slips for each prize');
  const byRank = new Map(campaign.prizeTiers.map((p) => [p.rank, p]));
  const wonBy = new Map();
  const cleaned = [];

  // Check smallest prize first, so a duplicate is reported against the prize revealed earlier.
  const order = revealOrder(campaign.prizeTiers);
  const sorted = [...picks].sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));

  for (const pick of sorted) {
    const prize = byRank.get(pick?.rank);
    if (!prize) throw new ValidationError('A winning slip points at a prize that does not exist');
    const slips = (pick.slipNumbers || []).map(Number);
    if (slips.length > (prize.quantity || 1)) {
      const qty = prize.quantity || 1;
      throw new ValidationError(`${prize.prizeDescription} has ${qty} winner${qty === 1 ? '' : 's'}`);
    }
    for (const slip of slips) {
      if (!Number.isInteger(slip) || slip < 1 || slip > campaign.slipCount) {
        throw new ValidationError(
          `Slip numbers go from 0001 to ${formatSlip(campaign.slipCount)}. Check ${Number.isFinite(slip) ? formatSlip(slip) : 'the number'}.`,
        );
      }
      if (wonBy.has(slip)) {
        throw new ValidationError(`Slip ${formatSlip(slip)} already won ${wonBy.get(slip)}. Draw another slip.`);
      }
      wonBy.set(slip, prize.prizeDescription);
    }
    cleaned.push({ rank: prize.rank, slipNumbers: slips });
  }
  return cleaned.sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
}

/** In-store reveal: the owner saves the slips drawn so far (a draft; nothing is public yet). */
export async function saveManualPicks(merchantId, drawId, picks) {
  const { draw, campaign } = await ownedSlipDraw(merchantId, drawId, 'manual_offline_reveal');
  if (draw.status !== 'scheduled') throw new ConflictError('The winners have already been published');

  const cleaned = validatePicks(picks, campaign);
  const updated = await LuckyDraw.findOneAndUpdate(
    { _id: draw._id, status: 'scheduled' },
    { $set: { manualPicks: cleaned } },
    { new: true },
  ).lean();
  if (!updated) throw new ConflictError('The winners have already been published');
  return updated;
}

/** Claims the draw so that two requests cannot settle it twice, creates winners, and finishes. */
async function settleDraw({ draw, campaign, slots, now, accountId, randomSeed = null, revealedCount }) {
  const claimed = await LuckyDraw.findOneAndUpdate(
    { _id: draw._id, status: 'scheduled' },
    { $set: { status: 'running', triggeredBy: { source: 'manual', accountId } } },
    { new: true },
  );
  if (!claimed) throw new ConflictError('The winners have already been picked for this draw');

  try {
    const expiresAt = new Date(now.getTime() + CLAIM_EXPIRY_DAYS * DAY_MS);
    const winners = slots.length
      ? await LuckyDrawWinner.insertMany(
          slots.map(({ prize, slipNumber }) => ({
            drawId: draw._id,
            campaignId: campaign._id,
            merchantId: campaign.merchantId,
            rank: prize.rank,
            slipNumber,
            prizeDescription: prize.prizeDescription,
            prizeValue: prize.prizeValue || 0,
            claimCode: generateClaimCode(),
            expiresAt,
          })),
        )
      : [];

    await LuckyDraw.updateOne(
      { _id: draw._id },
      {
        $set: {
          status: 'completed',
          executedAt: now,
          randomSeed,
          prizeTiersSnapshot: campaign.prizeTiers,
          prizeMode: 'shared',
          entryCount: campaign.slipCount,
          winnerCount: winners.length,
          reveal: {
            revealedCount,
            startedAt: now,
            ...(revealedCount >= campaign.prizeTiers.length ? { completedAt: now } : {}),
          },
        },
      },
    );
    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'ended' } });
  } catch (error) {
    await LuckyDrawWinner.deleteMany({ drawId: draw._id });
    await LuckyDraw.updateOne({ _id: draw._id }, { $set: { status: 'scheduled' }, $unset: { triggeredBy: 1 } });
    throw error;
  }

  const [finalDraw, winners] = await Promise.all([
    LuckyDraw.findById(draw._id).lean(),
    LuckyDrawWinner.find({ drawId: draw._id }).sort({ rank: 1, slipNumber: 1 }).lean(),
  ]);
  return { draw: finalDraw, winners };
}

/** In-store reveal: publishes the typed-in winners. Every prize must have all its winners. */
export async function publishManualWinners(merchantId, drawId, { now = new Date() } = {}) {
  const { draw, campaign } = await ownedSlipDraw(merchantId, drawId, 'manual_offline_reveal');
  if (draw.status !== 'scheduled') throw new ConflictError('The winners have already been published');
  assertEntriesClosed(campaign, now);

  const picks = validatePicks(draw.manualPicks || [], campaign);
  const needed = campaign.prizeTiers.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const entered = picks.reduce((sum, p) => sum + p.slipNumbers.length, 0);
  if (entered < needed) {
    throw new ValidationError(`${entered} of ${needed} winners entered. Enter every winning slip before publishing.`);
  }

  const byRank = new Map(campaign.prizeTiers.map((p) => [p.rank, p]));
  const slots = picks.flatMap((pick) => pick.slipNumbers.map((slipNumber) => ({ prize: byRank.get(pick.rank), slipNumber })));
  return settleDraw({ draw, campaign, slots, now, accountId: merchantId, revealedCount: campaign.prizeTiers.length });
}

/** Distinct random slips from 1..slipCount, as many as `count` (fewer if there are not enough slips). */
function pickSlips(slipCount, count, rng) {
  const wanted = Math.min(slipCount, count);
  if (slipCount <= wanted * 4) {
    // Small pool: partial Fisher-Yates over every slip.
    const all = Array.from({ length: slipCount }, (_, i) => i + 1);
    for (let i = 0; i < wanted; i++) {
      const j = i + Math.floor(rng() * (slipCount - i));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, wanted);
  }
  const picked = new Set();
  while (picked.size < wanted) picked.add(1 + Math.floor(rng() * slipCount));
  return [...picked];
}

/**
 * Online reveal: ScratchX picks the winning slips at random (grand prize first, from every slip),
 * stores them, and the owner then reveals them one category at a time.
 */
export async function startLiveReveal(merchantId, drawId, { now = new Date(), seed = null } = {}) {
  const { draw, campaign } = await ownedSlipDraw(merchantId, drawId, 'manual_online_reveal');
  if (draw.status !== 'scheduled') throw new ConflictError('The live reveal has already started');
  assertEntriesClosed(campaign, now);
  if (!campaign.slipCount) throw new ValidationError('Record how many slips were handed out before the reveal');

  const randomSeed = seed || crypto.randomBytes(8).toString('hex');
  const prizes = [...campaign.prizeTiers].sort((a, b) => a.rank - b.rank);
  const total = prizes.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const slips = pickSlips(campaign.slipCount, total, createSeededRng(randomSeed));

  const slots = [];
  let next = 0;
  for (const prize of prizes) {
    for (let i = 0; i < (prize.quantity || 1) && next < slips.length; i++) {
      slots.push({ prize, slipNumber: slips[next++] });
    }
  }
  return settleDraw({ draw, campaign, slots, now, accountId: merchantId, randomSeed, revealedCount: 0 });
}

/** Online reveal: makes the next category public (smallest prize first). */
export async function revealNextCategory(merchantId, drawId, { now = new Date() } = {}) {
  const { draw, campaign } = await ownedSlipDraw(merchantId, drawId, 'manual_online_reveal');
  if (!draw.reveal?.startedAt) throw new ConflictError('Start the live reveal first');

  const order = revealOrder(draw.prizeTiersSnapshot?.length ? draw.prizeTiersSnapshot : campaign.prizeTiers);
  const current = draw.reveal.revealedCount || 0;
  if (current >= order.length) throw new ConflictError('Every prize has already been revealed');

  const revealedCount = current + 1;
  const set = { 'reveal.revealedCount': revealedCount };
  if (revealedCount === order.length) set['reveal.completedAt'] = now;

  // Matching on the current count stops a double click from skipping a category.
  const updated = await LuckyDraw.findOneAndUpdate(
    { _id: draw._id, 'reveal.revealedCount': current },
    { $set: set },
    { new: true },
  ).lean();
  if (!updated) throw new ConflictError('That category was just revealed. Refresh to see the latest.');

  return { ...updated, nextRank: order[revealedCount] ?? null };
}
