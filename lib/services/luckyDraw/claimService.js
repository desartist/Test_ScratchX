import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';

/** The store owner records that a winner collected their prize, from the winners list. */
export async function markWinnerClaimed(merchantId, winnerId, { account, storeId = null, now = new Date() } = {}) {
  requireObjectId(winnerId, 'Winner not found');

  const winner = await LuckyDrawWinner.findOne({ _id: winnerId, merchantId, hiddenUntilReveal: { $ne: true } }).lean();
  if (!winner) throw new NotFoundError('Winner not found');
  if (winner.status === 'redeemed') throw new ConflictError('This prize was already claimed');
  if (winner.status === 'expired' || new Date(winner.expiresAt) <= now) throw new ConflictError('The claim period for this prize has expired');

  const set = { status: 'redeemed', redeemedAt: now, redeemedByAccountId: account._id };
  if (storeId) set.redeemedAtStoreId = storeId;

  const updated = await LuckyDrawWinner.findOneAndUpdate(
    { _id: winner._id, status: { $in: ['pending', 'notified'] }, expiresAt: { $gt: now } },
    { $set: set },
    { new: true },
  ).lean();
  if (!updated) throw new ConflictError('This prize was already claimed');
  return updated;
}
