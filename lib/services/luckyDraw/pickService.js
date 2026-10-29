import mongoose from 'mongoose';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import { ConflictError, ValidationError } from '@/lib/errors';
import { expandPrizeSlots } from '@/lib/luckyDraw/prizeCategories';
import { assertDrawOwner } from './openDraw';
import { claimAndFinishDraw } from './drawResult';

const FILL_ORDER_MESSAGE = 'Fill the bigger prizes first: the Grand Prize, then the Second Prizes, then the Third Prizes and so on';

/** "1 customer"/"2 customers" — so the short-of-customers message reads correctly for exactly one. */
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

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
      short
        ? `Only ${plural(people, 'customer')} entered, so pick ${plural(totalRequired, 'winner')}, starting with the Grand Prize`
        : 'Pick a winner for every prize',
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

  const tierByRank = new Map(campaign.prizeTiers.map((t) => [t.rank, t]));

  return claimAndFinishDraw(drawId, {
    triggeredBy: { source: 'picked', accountId: merchantId },
    alreadyClaimedMessage: 'The winners of this draw are already saved',
    now,
    // insertMany creates ids in array order, so _id keeps the order the owner picked within a prize.
    winnerSort: { rank: 1, _id: 1 },
    logLabel: '[LuckyDraw] picked winners SMS pass failed',
    build: async () => ({
      campaign,
      winners: list.map((p) => {
        const entry = byId.get(String(p.entryId));
        const tier = tierByRank.get(Number(p.rank));
        return { rank: tier.rank, entry, prizeDescription: tier.prizeDescription, prizeValue: tier.prizeValue || 0 };
      }),
      entryCount: await LuckyDrawEntry.countDocuments({ drawId: draw._id }),
      // A Physical draw's winners are known the moment the owner saves them, so it is fully revealed at once.
      reveal: { revealedCount: campaign.prizeTiers.length, startedAt: now, completedAt: now },
    }),
  });
}
