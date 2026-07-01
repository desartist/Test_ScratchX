import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Payment from "@/models/paymentModel";
import Subscription from "@/models/subscriptionModel";
import Account from "@/models/accountModel";
import Commission from "@/models/commissionModel";
import scratchEntitlementService from "@/lib/scratchEntitlementService";
import notificationService from "@/lib/services/notificationService";
import mockPaymentService from "@/lib/mockPaymentService";
import { createHmac } from "crypto";
import { cookies } from "next/headers";

const DEFAULT_COMMISSION_RATE = parseFloat(process.env.DISTRIBUTOR_COMMISSION_RATE ?? "20");

/**
 * POST /api/payment/verify
 *
 * Called by the frontend after Razorpay checkout completes.
 * Verifies the payment signature, activates the subscription,
 * and creates a commission record if a distributor is linked.
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { success: false, error: "Missing Razorpay payment fields" },
        { status: 400 },
      );
    }

    // — Verify HMAC signature —
    // Razorpay signs: order_id + "|" + payment_id with key_secret
    let isSignatureValid = false;

    if (mockPaymentService.isTestModeEnabled()) {
      // For mock payments, use mock signature generation
      const mockSignature = mockPaymentService.generateSignature(razorpay_order_id, razorpay_payment_id);
      isSignatureValid = mockSignature === razorpay_signature;
      if (isSignatureValid) {
        console.log('✓ Mock payment signature verified (TEST MODE)');
      }
    } else {
      // For real payments, use actual Razorpay verification
      const expectedSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      isSignatureValid = expectedSignature === razorpay_signature;
    }

    if (!isSignatureValid) {
      console.error("[Payment Verify] Invalid signature for order:", razorpay_order_id);
      return Response.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 },
      );
    }

    // — Find and update the Payment record —
    const payment = await Payment.findOneAndUpdate(
      { gatewayOrderId: razorpay_order_id, merchantId: account._id },
      {
        status: "success",
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
      },
      { new: true },
    );

    if (!payment) {
      console.error("[Payment Verify] Payment record not found for order:", razorpay_order_id);
      return Response.json(
        { success: false, error: "Payment record not found" },
        { status: 404 },
      );
    }

    // — Create subscription for one-time lifetime plan —
    const now = new Date();

    // Determine plan type from plan metadata or default to CORE
    const planType = payment.metadata?.planType || "CORE";

    // Validate planType is valid
    if (!["CORE", "SMART"].includes(planType)) {
      console.error("[Payment Verify] Invalid planType:", planType);
      return Response.json(
        { success: false, error: "Invalid plan type" },
        { status: 400 },
      );
    }

    // Cancel any existing subscriptions
    await Subscription.updateMany(
      { merchantId: account._id },
      { status: "cancelled" }
    );

    // Create new subscription (lifetime - no end date)
    const subscription = new Subscription({
      ownerId: account._id,
      ownerType: "merchant",
      merchantId: account._id,
      planId: payment.planId,
      planType: planType,
      status: "active",
      billingCycle: "one-time",
      purchaseDate: now,
    });

    await subscription.save();

    // Link subscription to payment
    await Payment.findByIdAndUpdate(payment._id, { subscriptionId: subscription._id });

    // Activate unlimited scratches for 90 days (quarterly)
    await scratchEntitlementService.activateUnlimitedScratches(subscription._id);

    // Update account with subscription info
    await Account.findByIdAndUpdate(
      account._id,
      {
        activePlan: planType,
        subscriptionId: subscription._id,
        planPurchaseDate: now,
      },
      { new: true }
    );

    // — Create commission for distributor if linked —
    if (payment.distributorId) {
      const distributor = await Account.findById(payment.distributorId).select(
        "profile.commissionRate",
      );
      const rate = distributor?.profile?.commissionRate ?? DEFAULT_COMMISSION_RATE;
      const commissionAmount = Math.round((payment.totalAmount * rate) / 100);

      await Commission.create({
        distributorId: payment.distributorId,
        merchantId: account._id,
        paymentId: payment._id,
        commissionRate: rate,
        commissionAmount,
        currency: payment.currency,
        status: "pending",
      });
    }

    // Send plan purchase notification (email + in-app)
    // Non-blocking - don't throw if notification fails
    notificationService.sendPlanPurchaseNotification(
      account._id,
      "merchant",
      { planType }
    ).catch((error) => console.error("[Payment Verify] Notification error:", error));

    console.log(`✓ [Payment Verified] ${planType} plan activated for merchant ${account._id.toString()}`);

    // Update merchantHasSub cookie so middleware immediately allows access
    try {
      const cookieStore = await cookies();
      cookieStore.set('merchantHasSub', '1', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    } catch (_) {}

    return Response.json(
      {
        success: true,
        subscription: {
          _id: subscription._id,
          planType: subscription.planType,
          status: subscription.status,
          purchaseDate: subscription.purchaseDate,
          lifetime: true,
        },
        payment: {
          _id: payment._id,
          status: payment.status,
          totalAmount: payment.totalAmount,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Payment verify error:", err);
    return Response.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
