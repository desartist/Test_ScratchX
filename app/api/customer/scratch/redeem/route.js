import { NextResponse } from 'next/server';

/**
 * POST /api/customer/scratch/redeem — DISABLED.
 *
 * This was an unauthenticated customer self-redeem: anyone holding a
 * scratchCardId could mark it redeemed, with no cashier involved. Nothing in
 * the app calls it any more — customers show their revealed coupon at the
 * counter and store staff redeem it through /api/store-redemptions (Store_Staff
 * only), which goes through the atomic RedemptionService.redeemScratchCard.
 *
 * Now that rewards can carry limited stock, leaving this open would let a
 * customer-facing endpoint consume that stock without a staff check, so it
 * refuses every request instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Coupons are redeemed by store staff. Please show this coupon at the counter.',
      data: null,
    },
    { status: 410 }
  );
}
