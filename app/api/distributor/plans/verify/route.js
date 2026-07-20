/**
 * POST /api/distributor/plans/verify
 *
 * Verifies the Razorpay payment signature for a distributor plan-credit
 * order, then confirms the order and credits the distributor's real
 * inventory (via lib/services/distributor: purchaseService/inventoryService).
 *
 * Body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { purchaseService, inventoryService, notificationService } from '@/lib/services/distributor';
import DistributorOrder from '@/models/distributorOrderModel';
import Account from '@/models/accountModel';
import mockPaymentService from '@/lib/mockPaymentService';
import { sendDistributorOrderConfirmationEmail, sendAdminPurchaseAlertEmail } from '@/lib/emailService';
import { createHmac } from 'crypto';

export async function POST(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can verify plan purchases' },
        { status: 403 }
      );
    }

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await request.json();

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment fields' },
        { status: 400 }
      );
    }

    const order = await DistributorOrder.findById(orderId);
    if (!order || order.distributorId.toString() !== account._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.paymentGatewayReference !== razorpay_order_id) {
      return NextResponse.json(
        { success: false, error: 'Order/payment mismatch' },
        { status: 400 }
      );
    }

    let isSignatureValid = false;
    if (mockPaymentService.isTestModeEnabled()) {
      const mockSignature = mockPaymentService.generateSignature(
        razorpay_order_id,
        razorpay_payment_id
      );
      isSignatureValid = mockSignature === razorpay_signature;
    } else {
      const expectedSignature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      isSignatureValid = expectedSignature === razorpay_signature;
    }

    if (!isSignatureValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    const confirmedOrder = await purchaseService.confirmPayment(
      orderId,
      razorpay_payment_id,
      account._id
    );

    const inventory = await inventoryService.getDistributorInventory(account._id);

    await notificationService.notifyPurchaseSuccess(account._id, {
      orderNumber: confirmedOrder.orderNumber,
      totalAmount: confirmedOrder.pricing.grandTotal,
      orderId: confirmedOrder._id,
    });

    try {
      await sendDistributorOrderConfirmationEmail(account, confirmedOrder);
    } catch (emailError) {
      console.error('[Distributor Plans] Failed to send purchaser confirmation email:', emailError);
    }

    try {
      const admins = await Account.find({ role: 'Super_Admin', status: 'active' }).select('email');
      const itemsSummary = confirmedOrder.items
        .map((item) => `${item.quantity} × ${item.planName || item.planType}`)
        .join(', ');
      await sendAdminPurchaseAlertEmail(
        admins.map((admin) => admin.email),
        { name: account.name, email: account.email, phone: account.phone, role: account.role },
        {
          orderNumber: confirmedOrder.orderNumber,
          purchaseType: 'Distributor License Purchase',
          itemsSummary,
          amount: confirmedOrder.pricing.grandTotal,
        }
      );
    } catch (emailError) {
      console.error('[Distributor Plans] Failed to send admin purchase alert email:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: confirmedOrder._id,
          orderNumber: confirmedOrder.orderNumber,
          grandTotal: confirmedOrder.pricing.grandTotal,
          inventory,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Distributor Plans] Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
