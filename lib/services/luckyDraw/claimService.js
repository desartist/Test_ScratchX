import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';

const MOBILE = /^[0-9]{10}$/;

/**
 * The store owner records that a winner collected their prize, from the winners list.
 * Slip winners have no phone on record, so the owner can note who collected it.
 */
export async function markWinnerClaimed(
  merchantId,
  winnerId,
  { account, storeId = null, customerName = '', customerPhone = '', now = new Date() } = {},
) {
  requireObjectId(winnerId, 'Winner not found');
  const name = String(customerName || '').trim();
  const phone = String(customerPhone || '').trim();
  if (name.length > 80) throw new ValidationError('The name can be at most 80 characters');
  if (phone && !MOBILE.test(phone)) throw new ValidationError('Mobile number must be exactly 10 digits');

  const winner = await LuckyDrawWinner.findOne({ _id: winnerId, merchantId }).lean();
  if (!winner) throw new NotFoundError('Winner not found');
  if (winner.status === 'redeemed') throw new ConflictError('This prize was already claimed');
  if (winner.status === 'expired' || new Date(winner.expiresAt) <= now) throw new ConflictError('The claim period for this prize has expired');

  const set = { status: 'redeemed', redeemedAt: now, redeemedByAccountId: account._id };
  if (storeId) set.redeemedAtStoreId = storeId;
  // Only fill in details for slip winners; online winners already have theirs.
  if (winner.slipNumber != null) {
    if (name) set.customerName = name;
    if (phone) set.customerPhone = phone;
  }

  const updated = await LuckyDrawWinner.findOneAndUpdate(
    { _id: winner._id, status: { $in: ['pending', 'notified'] }, expiresAt: { $gt: now } },
    { $set: set },
    { new: true },
  ).lean();
  if (!updated) throw new ConflictError('This prize was already claimed');
  return updated;
}
