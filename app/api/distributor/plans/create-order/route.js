/**
 * POST /api/distributor/plans/create-order
 *
 * A distributor buys Core/Smart plan credits in bulk (to later assign to
 * retailers). Creates a draft+submitted DistributorOrder priced at the
 * distributor's own commission rate, then opens a real Razorpay order
 * (or a signed mock order in PAYMENT_TEST_MODE) for the total.
 */
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { purchaseService, commissionService } from '@/lib/services/distributor';
import razorpay from '@/lib/razorpay';
import mockPaymentService from '@/lib/mockPaymentService';

// Unit MRP (with 18% GST) — must match the CORE/SMART prices returned by
// GET /api/subscription/plans (price.withGST).
const PLAN_UNIT_MRP = {
  CORE: 2477,
  SMART: 3539,
};
const MIN_QUANTITY = 5;

export async function POST(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can purchase plans' },
        { status: 403 }
      );
    }

    const { items, includeGst = true } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!PLAN_UNIT_MRP[item.planType]) {
        return NextResponse.json(
          { success: false, error: `Invalid planType "${item.planType}"` },
          { status: 400 }
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity < MIN_QUANTITY) {
        return NextResponse.json(
          { success: false, error: `Minimum ${MIN_QUANTITY} licenses per plan` },
          { status: 400 }
        );
      }
    }

    const priceItems = items.map((item) => ({
      planType: item.planType,
      planName: item.planType === 'CORE' ? 'ScratchX Core' : 'ScratchX Smart',
      quantity: item.quantity,
      unitMRP: PLAN_UNIT_MRP[item.planType],
    }));

    const commissionPercentage = await commissionService.getCommissionPercentage(account._id);

    const { order, pricing } = await purchaseService.createDraftOrder(
      account._id,
      priceItems,
      account._id,
      includeGst
    );
    await purchaseService.submitOrder(order._id, account._id, 'razorpay');

    const isTestMode = mockPaymentService.isTestModeEnabled();
    let gatewayOrder;
    let mockPaymentData = null;

    if (isTestMode) {
      gatewayOrder = mockPaymentService.createMockOrder({
        amount: Math.round(pricing.grandTotal * 100),
        currency: 'INR',
        receipt: `dist_order_${order._id}`,
        notes: { distributorId: account._id.toString(), orderId: order._id.toString() },
      });
      mockPaymentData = mockPaymentService.createMockPaymentData(gatewayOrder.id);
    } else {
      gatewayOrder = await razorpay.orders.create({
        amount: Math.round(pricing.grandTotal * 100),
        currency: 'INR',
        receipt: `dist_order_${order._id}`,
        notes: { distributorId: account._id.toString(), orderId: order._id.toString() },
      });
    }

    order.paymentGatewayReference = gatewayOrder.id;
    await order.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          gatewayOrderId: gatewayOrder.id,
          amount: Math.round(pricing.grandTotal * 100), // paise
          currency: 'INR',
          razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          commissionPercentage,
          pricing,
          ...(mockPaymentData && { mockPayment: mockPaymentData, testMode: true }),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Distributor Plans] Error creating order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
