import Account from '@/models/accountModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';

export const REDEEM_ROLES = ['Merchant', 'Manager', 'Store_Manager', 'Store_Staff'];
const MAX_HIERARCHY_DEPTH = 4;

/** The merchant an account works for: itself, or the first Merchant up its parentId chain. */
export async function resolveMerchantId(account) {
  if (account.role === 'Merchant') return String(account._id);

  let parentId = account.parentId;
  for (let depth = 0; depth < MAX_HIERARCHY_DEPTH && parentId; depth++) {
    const parent = await Account.findById(parentId).select('role parentId').lean();
    if (!parent) return null;
    if (parent.role === 'Merchant') return String(parent._id);
    parentId = parent.parentId;
  }
  return null;
}

export async function redeemClaimCode({ claimCode, account, storeId = null, now = new Date() }) {
  if (!REDEEM_ROLES.includes(account.role)) {
    throw new AuthorizationError('Your role cannot redeem Lucky Draw prizes');
  }

  const merchantId = await resolveMerchantId(account);
  if (!merchantId) throw new AuthorizationError('Your account is not linked to a store owner');

  const code = String(claimCode || '').trim().toUpperCase();
  if (!code) throw new ValidationError('Enter the claim code');

  const winner = await LuckyDrawWinner.findOne({ claimCode: code });
  // Codes of other merchants look exactly like unknown codes.
  if (!winner || String(winner.merchantId) !== merchantId) throw new NotFoundError('Claim code not found');

  if (winner.status === 'redeemed') throw new ConflictError('This prize was already redeemed');
  if (winner.status === 'expired' || winner.expiresAt <= now) throw new ConflictError('This claim code has expired');

  if (storeId) {
    const campaign = await LuckyDrawCampaign.findById(winner.campaignId).select('assignedStores').lean();
    const atStore = campaign?.assignedStores?.some((s) => String(s.storeId) === String(storeId));
    if (!atStore) throw new ValidationError('This code is not valid at that store');
  }

  const set = { status: 'redeemed', redeemedAt: now, redeemedByAccountId: account._id };
  if (storeId) set.redeemedAtStoreId = storeId;

  const redeemed = await LuckyDrawWinner.findOneAndUpdate(
    { _id: winner._id, status: { $in: ['pending', 'notified'] }, expiresAt: { $gt: now } },
    { $set: set },
    { new: true },
  ).lean();
  if (!redeemed) throw new ConflictError('This prize was already redeemed');

  return redeemed;
}

/** Flips unredeemed winners whose claim window has passed to `expired`. Returns how many. */
export async function expireStaleWinners(now = new Date()) {
  const result = await LuckyDrawWinner.updateMany(
    { status: { $in: ['pending', 'notified'] }, expiresAt: { $lte: now } },
    { $set: { status: 'expired' } },
  );
  return result.modifiedCount;
}
