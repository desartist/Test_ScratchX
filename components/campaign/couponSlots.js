/**
 * Coupon-slot state for the reward-range editor (RangeWizard) — plain
 * functions, no React, so the rules are unit-tested on their own
 * (__tests__/unit/couponSlots.test.js).
 */

export const DEFAULT_COUPONS = 6;

// Mirrors MAX_REWARD_QUANTITY in lib/services/rewardInventoryService.js —
// the server re-validates everything; this is just for instant feedback.
export const MAX_QUANTITY = 1_000_000;

const VALID_TYPES = new Set(["flat", "percentage", "gift"]);
/**
 * One coupon slot. `rewardId` ties an edited slot back to the stored reward
 * (so its stock and redemption history carry over). The quantity box edits
 * `availableQuantity` — how many are LEFT to win; the server adds its own
 * live `redeemedQuantity` to get the total. `redeemedQuantity` is
 * server-owned and only displayed here.
 *
 * `autoActivate`: an empty slot padded in when editing a saved range. Empty
 * coupons are never saved (there's no reward to store), so such a slot
 * starts Inactive — it hands out nothing — and switches itself on the first
 * time an amount or image is entered, unless the merchant toggles it first.
 */
export function emptyCoupon({ padded = false } = {}) {
  return {
    rewardId: null,
    type: "flat",
    amount: "",
    description: "",
    isActive: !padded,
    autoActivate: padded,
    quantityEnabled: false,
    availableQuantity: "1",
    redeemedQuantity: 0,
  };
}

export function makeCoupons(count) {
  const safe = Number(count) > 0 ? Number(count) : DEFAULT_COUPONS;
  return Array.from({ length: safe }, () => emptyCoupon());
}

export function couponsFromRange(rewards, min) {
  const list = Array.isArray(rewards) ? rewards : [];
  const mapped = list.map((r) => {
    const type = VALID_TYPES.has(r?.type) ? r.type : "flat";
    const raw  = r?.value ?? r?.amount ?? "";
    return {
      ...emptyCoupon(),
      rewardId: r?.rewardId || null,
      type,
      amount: raw === "" || raw == null ? "" : String(raw),
      description: r?.description || "",
      // Records saved before this feature have neither field: active, unlimited.
      isActive: r?.isActive !== false,
      quantityEnabled: r?.quantityEnabled === true,
      availableQuantity: String(storedAvailable(r)),
      redeemedQuantity: Number(r?.redeemedQuantity) || 0,
    };
  });
  const target = Math.max(Number(min) > 0 ? Number(min) : DEFAULT_COUPONS, mapped.length);
  while (mapped.length < target) mapped.push(emptyCoupon({ padded: true }));
  return mapped;
}

/** How many are left on a stored reward (1 for a reward never limited). */
export function storedAvailable(r) {
  if (r?.remainingQuantity != null) return Math.max(0, Number(r.remainingQuantity) || 0);
  if (r?.totalQuantity != null) {
    return Math.max(0, (Number(r.totalQuantity) || 0) - (Number(r.redeemedQuantity) || 0));
  }
  return 1;
}

/** Whole number 0…cap, or null. */
export function parseQty(v) {
  const s = String(v ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= 0 && n <= MAX_QUANTITY ? n : null;
}

/** Lowest allowed "available": 0 once some are redeemed, else 1 (total ≥ 1). */
export function minAvailable(c) {
  return (Number(c.redeemedQuantity) || 0) > 0 ? 0 : 1;
}

/**
 * Set a slot's available quantity. Reaching 0 switches the coupon off —
 * the same thing that happens on its own when the last one is won.
 */
export function withAvailable(c, value) {
  const n = parseQty(value);
  return { ...c, availableQuantity: value, ...(n === 0 ? { isActive: false, autoActivate: false } : {}) };
}

/** An amount/image was just entered into a padded empty slot → switch it on. */
export function autoActivated(c, nextAmount) {
  if (!c.autoActivate || !nextAmount) return c;
  return { ...c, isActive: true, autoActivate: false };
}
