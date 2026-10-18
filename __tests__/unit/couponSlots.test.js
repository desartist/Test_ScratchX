/**
 * Coupon-editor slot rules (components/campaign/couponSlots.js).
 */
import {
  autoActivated,
  couponsFromRange,
  emptyCoupon,
  makeCoupons,
  minAvailable,
  withAvailable,
} from '@/components/campaign/couponSlots';

const stored = (extra) => ({ rewardId: 'r1', type: 'gift', value: 'img', isActive: true, ...extra });

describe('the quantity box shows what is LEFT', () => {
  test('your screenshot: total 2, 1 won → box shows 1', () => {
    const [c] = couponsFromRange([stored({ quantityEnabled: true, totalQuantity: 2, remainingQuantity: 1, redeemedQuantity: 1 })], 1);
    expect(c).toMatchObject({ availableQuantity: '1', redeemedQuantity: 1, quantityEnabled: true });
  });

  test('records without remaining fall back to total − redeemed; unlimited start at 1', () => {
    expect(couponsFromRange([stored({ quantityEnabled: true, totalQuantity: 5, redeemedQuantity: 2 })], 1)[0].availableQuantity).toBe('3');
    expect(couponsFromRange([stored({})], 1)[0].availableQuantity).toBe('1');
  });

  test('can go down to 0 once some are won — and 0 switches the coupon off', () => {
    const c = couponsFromRange([stored({ quantityEnabled: true, totalQuantity: 2, remainingQuantity: 1, redeemedQuantity: 1 })], 1)[0];
    expect(minAvailable(c)).toBe(0);
    expect(withAvailable(c, '0')).toMatchObject({ availableQuantity: '0', isActive: false });
    expect(withAvailable(c, '4')).toMatchObject({ availableQuantity: '4', isActive: true });
  });

  test('a reward nobody has won yet needs at least 1', () => {
    expect(minAvailable(emptyCoupon())).toBe(1);
  });
});

describe('empty slots (never saved) do not come back as Active', () => {
  test('your screenshot: coupons 3 & 4 switched off with no amount → reopen Inactive', () => {
    // Only coupons 1 and 2 had a reward, so only they were saved.
    const slots = couponsFromRange([stored({}), { rewardId: 'r2', type: 'flat', value: 34, isActive: true }], 6);
    expect(slots).toHaveLength(6);
    expect(slots.map((s) => s.isActive)).toEqual([true, true, false, false, false, false]);
  });

  test('a saved inactive coupon stays inactive', () => {
    expect(couponsFromRange([stored({ isActive: false })], 1)[0].isActive).toBe(false);
  });

  test('typing an amount into an empty slot switches it on', () => {
    const [, padded] = couponsFromRange([stored({})], 2);
    expect(autoActivated({ ...padded, amount: '50' }, '50')).toMatchObject({ isActive: true, autoActivate: false });
    expect(autoActivated(padded, '')).toMatchObject({ isActive: false });
  });

  test('…but not once the merchant has chosen its status themselves', () => {
    const [, padded] = couponsFromRange([stored({})], 2);
    const chosen = { ...padded, isActive: false, autoActivate: false }; // toggled by hand
    expect(autoActivated({ ...chosen, amount: '50' }, '50').isActive).toBe(false);
  });

  test('a brand-new range still starts with every slot Active', () => {
    expect(makeCoupons(6).every((c) => c.isActive && !c.autoActivate)).toBe(true);
  });
});
