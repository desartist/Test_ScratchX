/**
 * Per-store Store_Manager/Store_Staff seat limits.
 *
 * Manager count is hard-capped at MAX_MANAGERS_PER_STORE (1) on every store,
 * regardless of business model or plan — that's a fixed product rule, not a
 * purchasable/expandable limit. The total-seat cap (Manager + Staff
 * combined) is what actually varies:
 *
 *   Business model | Plan  | Store              | Max Total
 *   Wholesale       | any   | any                | 5
 *   Retail          | CORE  | (only 1 store)     | 3
 *   Retail          | SMART | main store         | 3
 *   Retail          | SMART | additional store   | 2 (each, independently)
 *
 * account.activePlan is the real source of truth for Core/Smart merchants
 * (set directly in app/api/payment/verify/route.js) — the SubscriptionPlan
 * DB collection's limits.* fields are a legacy 5-tier system (Trial..
 * Enterprise) that isn't actually wired up for Core/Smart, so team limits
 * live here as plain config instead of another unused DB field.
 */

export const EXTRA_SEAT_PRICE_INR = 199;
export const MAX_MANAGERS_PER_STORE = 1;

/**
 * Base (pre-addon) total-seat limit for one store.
 * @param {{profile?: {businessModel?: string}, activePlan?: string}} merchantAccount
 * @param {boolean} isMainStore - only relevant for Retail + SMART; ignored otherwise
 */
export function getBaseTeamLimits(merchantAccount, isMainStore) {
  const businessModel = merchantAccount?.profile?.businessModel;
  const activePlan = merchantAccount?.activePlan;

  if (businessModel === 'Wholesale') {
    return { maxTotal: 5 };
  }
  if (activePlan === 'SMART') {
    return { maxTotal: isMainStore ? 3 : 2 };
  }
  if (activePlan === 'CORE') {
    return { maxTotal: 3 };
  }
  return { maxTotal: 0 };
}
