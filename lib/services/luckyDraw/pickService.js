import mongoose from 'mongoose';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError, ValidationError } from '@/lib/errors';
import { CLAIM_EXPIRY_DAYS } from '@/lib/luckyDraw/constants';
import { expandPrizeSlots } from '@/lib/luckyDraw/prizeCategories';
import { assertDrawOwner } from './openDraw';
import { generateClaimCode } from './claimCode';
import { notifyPendingWinners } from './winnerNotifications';

const DAY_MS = 24 * 60 * 60 * 1000;
const FILL_ORDER_MESSAGE = 'Fill the bigger prizes first: the grand prize, then the 2nd prizes, then the 3rd prizes';

/** How many picks each rank must have: every slot, or (with fewer customers than slots) the top slots only. */
function requiredPerRank(prizeTiers, people) {
  let left = Math.min(people, expandPrizeSlots(prizeTiers).length);
  const required = new Map();
  for (const tier of [...prizeTiers].sort((a, b) => a.rank - b.rank)) {
    const take = Math.min(left, tier.quantity || 1);
    required.set(tier.rank, take);
    left -= take;
  }
  return required;
}

/**
 * The owner records the winners of a Physical draw held in the shop, all at once.
 * picks: [{ rank, entryId }], one per prize slot.
 */
export async function saveWinnerPicks(merchantId, drawId, picks, { now = new Date() } = {}) {
  const { draw, campaign } = await assertDrawOwner(drawId, merchantId);
  if (campaign.drawType !== 'physical') throw new ConflictError('Only physical draws have their winners picked by hand');
  if (draw.status !== 'scheduled') throw new ConflictError('The winners of this draw are already saved');
  if (now < new Date(campaign.endDate)) throw new ConflictError('You can pick the winners once entries close');

  const list = Array.isArray(picks) ? picks : [];
  const people = (await LuckyDrawEntry.distinct('customerPhone', { drawId: draw._id })).length;
  if (people === 0) throw new ConflictError('Nobody entered this draw, so there is no one to pick');

  const required = requiredPerRank(campaign.prizeTiers, people);
  const totalRequired = [...required.values()].reduce((sum, n) => sum + n, 0);
  const short = totalRequired < expandPrizeSlots(campaign.prizeTiers).length;
  const given = new Map();
  for (const p of list) {
    const rank = Number(p?.rank);
    if (!required.has(rank)) throw new ValidationError('Pick winners only for the prizes in this draw');
    given.set(rank, (given.get(rank) || 0) + 1);
  }
  if (list.length !== totalRequired) {
    throw new ValidationError(
      short ? `Only ${people} customers entered, so pick ${totalRequired} winners, starting with the grand prize` : 'Pick a winner for every prize',
    );
  }
  for (const [rank, count] of required) {
    if ((given.get(rank) || 0) !== count) throw new ValidationError(short ? FILL_ORDER_MESSAGE : 'Pick a winner for every prize');
  }

  const ids = list.map((p) => String(p.entryId));
  if (ids.some((id) => !mongoose.isValidObjectId(id))) throw new ValidationError('One of the picked entries is not in this draw');
  const entries = await LuckyDrawEntry.find({ _id: { $in: ids }, drawId: draw._id }).lean();
  const byId = new Map(entries.map((e) => [String(e._id), e]));
  if (new Set(ids).size !== ids.length) {
    const twice = byId.get(ids.find((id, i) => ids.indexOf(id) !== i));
    throw new ValidationError(`${twice?.customerName || 'A customer'} is picked twice. A customer can win only one prize.`);
  }
  if (entries.length !== ids.length) throw new ValidationError('One of the picked entries is not in this draw');
  const seenPhones = new Map();
  for (const id of ids) {
    const entry = byId.get(id);
    if (seenPhones.has(entry.customerPhone)) {
      throw new ValidationError(`${entry.customerName} is picked twice. A customer can win only one prize.`);
    }
    seenPhones.set(entry.customerPhone, true);
  }

  // Claim the draw atomically so a double click cannot save the winners twice.
  const claimed = await LuckyDraw.findOneAndUpdate(
    { _id: draw._id, status: 'scheduled' },
    { $set: { status: 'running', triggeredBy: { source: 'picked', accountId: merchantId } } },
    { new: true },
  );
  if (!claimed) throw new ConflictError('The winners of this draw are already saved');

  const tierByRank = new Map(campaign.prizeTiers.map((t) => [t.rank, t]));
  const expiresAt = new Date(now.getTime() + CLAIM_EXPIRY_DAYS * DAY_MS);
  try {
    await LuckyDrawWinner.insertMany(
      list.map((p) => {
        const entry = byId.get(String(p.entryId));
        const tier = tierByRank.get(Number(p.rank));
        return {
          drawId: draw._id,
          campaignId: campaign._id,
          merchantId: campaign.merchantId,
          rank: tier.rank,
          entryId: entry._id,
          customerName: entry.customerName,
          customerPhone: entry.customerPhone,
          prizeDescription: tier.prizeDescription,
          prizeValue: tier.prizeValue || 0,
          claimCode: generateClaimCode(),
          expiresAt,
        };
      }),
    );
    const entryCount = await LuckyDrawEntry.countDocuments({ drawId: draw._id });
    await LuckyDraw.updateOne(
      { _id: draw._id },
      {
        $set: {
          status: 'completed',
          executedAt: now,
          prizeTiersSnapshot: campaign.prizeTiers,
          entryCount,
          winnerCount: list.length,
          reveal: { revealedCount: campaign.prizeTiers.length, startedAt: now, completedAt: now },
        },
      },
    );
    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'ended' } });
  } catch (error) {
    await LuckyDrawWinner.deleteMany({ drawId: draw._id });
    await LuckyDraw.updateOne({ _id: draw._id }, { $set: { status: 'scheduled' }, $unset: { triggeredBy: 1 } });
    throw error;
  }

  let notified = { sent: 0, failed: 0 };
  try {
    notified = await notifyPendingWinners({ drawId: draw._id, now });
  } catch (error) {
    // The cron retries anyone who was not texted; the winners are saved.
    console.error('[LuckyDraw] picked winners SMS pass failed', error.message);
  }

  const [completed, winners] = await Promise.all([
    LuckyDraw.findById(draw._id).lean(),
    // insertMany creates ids in array order, so _id keeps the order the owner picked within a prize.
    LuckyDrawWinner.find({ drawId: draw._id }).sort({ rank: 1, _id: 1 }).lean(),
  ]);
  return { draw: completed, winners, notified };
}
