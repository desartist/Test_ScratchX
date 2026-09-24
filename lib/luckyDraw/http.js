import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { luckyDrawDisabledResponse } from './guard';
import { fail } from './response';

export { ok, fail, errorResponse, readJson } from './response';

const REDEEM_ROLES = ['Merchant', 'Manager', 'Store_Manager', 'Store_Staff'];

async function authorize(allowedRoles, forbiddenMessage) {
  const disabled = luckyDrawDisabledResponse();
  if (disabled) return { error: disabled };

  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return { error };
  if (!allowedRoles.includes(account.role)) return { error: fail(forbiddenMessage, 403) };
  return { account, merchantId: String(account._id) };
}

/** Store owner (Merchant) only. Returns { error } or { account, merchantId }. */
export const requireMerchant = () => authorize(['Merchant'], 'Only the store owner can do this');

/** Anyone who staffs a store and may redeem a prize. */
export const requireRedeemer = () => authorize(REDEEM_ROLES, 'Your role cannot redeem Lucky Draw prizes');
