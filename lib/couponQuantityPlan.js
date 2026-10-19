/**
 * Scratch allocation for a campaign whose coupons all have a set quantity.
 *
 * When EVERY saved coupon in the campaign (across all bill ranges) has
 * "Set Reward Quantity" on, the campaign can only ever hand out the sum of
 * those quantities — so its scratches are fixed at that total, and the
 * allocation screens show just that number instead of the quick-select
 * chips and free entry. If even one coupon is unlimited, there's no fixed
 * number and allocation works as before.
 *
 * Pure (no DB / server imports): used by the allocation screens and by
 * POST /api/campaigns/[id]/allocate-scratch, which enforces it.
 */

/**
 * @param {Array} ranges the campaign's ranges, each with `rewards`
 * @returns {{
 *   limited: boolean,       // every coupon has a quantity → allocation fixed
 *   total: number|null,     // that fixed total (null when not fixed)
 *   reserved: number,       // scratches the quantity-limited coupons need
 *   limitedCount: number,   // how many coupons have a quantity
 *   couponCount: number,
 * }}
 */
export function couponQuantityPlan(ranges) {
  const coupons = (Array.isArray(ranges) ? ranges : []).flatMap((r) =>
    Array.isArray(r?.rewards) ? r.rewards.filter(Boolean) : [],
  );
  const isLimited = (c) => c.quantityEnabled === true && Number(c.totalQuantity) > 0;
  const limitedCoupons = coupons.filter(isLimited);
  const reserved = limitedCoupons.reduce((sum, c) => sum + Number(c.totalQuantity), 0);
  const allLimited = coupons.length > 0 && limitedCoupons.length === coupons.length;

  return {
    limited: allLimited,
    total: allLimited ? reserved : null,
    reserved,
    limitedCount: limitedCoupons.length,
    couponCount: coupons.length,
  };
}

/**
 * The allocation a fixed-quantity campaign must have: the coupons' total,
 * but never below the scratches customers have already used (those can't be
 * taken back). Null when the campaign isn't fixed.
 */
export function requiredAllocation(plan, used = 0) {
  if (!plan?.limited) return null;
  return Math.max(plan.total, Number(used) || 0);
}

/**
 * The least a campaign with SOME quantity-limited coupons may be allocated:
 * enough scratches for every limited reward (the unlimited ones share the
 * rest), and never below what's already used. 0 when nothing is reserved.
 */
export function minimumAllocation(plan, used = 0) {
  return Math.max(Number(plan?.reserved) || 0, Number(used) || 0);
}
