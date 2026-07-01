/**
 * POST /api/payment/webhook
 * Razorpay webhook handler for payment events
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/connectDB";
import Payment from "@/models/paymentModel";
import Subscription from "@/models/subscriptionModel";
import SubscriptionPlan from "@/models/subscriptionPlanModel";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("Invalid webhook signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 403 }
      );
    }

    const event = JSON.parse(body);

    // Handle payment success
    if (event.event === "payment.authorized" || event.event === "payment.captured") {
      return handlePaymentSuccess(event);
    }

    // Handle payment failed
    if (event.event === "payment.failed") {
      return handlePaymentFailed(event);
    }

    return NextResponse.json(
      { success: true, message: "Event acknowledged" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 to acknowledge receipt
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(event) {
  try {
    const razorpayPaymentId = event.payload.payment.entity.id;
    const razorpayOrderId = event.payload.payment.entity.order_id;

    // Find payment record
    const payment = await Payment.findOne({
      gatewayOrderId: razorpayOrderId,
    }).populate("planId");

    if (!payment) {
      console.error("Payment record not found:", razorpayOrderId);
      return NextResponse.json(
        { success: true, message: "Payment not found in our system" },
        { status: 200 }
      );
    }

    // Update payment status
    payment.status = "success";
    payment.gatewayPaymentId = razorpayPaymentId;
    payment.completedAt = new Date();
    await payment.save();

    // Check if subscription already exists
    let subscription = await Subscription.findOne({
      merchantId: payment.merchantId,
      planId: payment.planId,
    });

    if (!subscription) {
      // Create new subscription
      const now = new Date();
      let periodEnd;

      if (payment.billingCycle === "annual") {
        periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      } else {
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      }

      subscription = new Subscription({
        merchantId: payment.merchantId,
        planId: payment.planId,
        paymentId: payment._id,
        status: "active",
        billingCycle: payment.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      await subscription.save();
    } else {
      // Update existing subscription
      subscription.status = "active";
      subscription.paymentId = payment._id;
      await subscription.save();
    }

    console.log(
      `Payment success: ${payment._id} for merchant ${payment.merchantId}`
    );

    return NextResponse.json(
      { success: true, message: "Payment processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing payment success:", error);
    return NextResponse.json(
      { success: true, message: "Webhook processed" },
      { status: 200 }
    );
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event) {
  try {
    const razorpayOrderId = event.payload.payment.entity.order_id;
    const errorReason = event.payload.payment.entity.error_reason;

    // Find payment record
    const payment = await Payment.findOne({
      gatewayOrderId: razorpayOrderId,
    });

    if (payment) {
      payment.status = "failed";
      payment.errorMessage = errorReason;
      payment.failedAt = new Date();
      await payment.save();
    }

    console.log(
      `Payment failed: ${razorpayOrderId} - ${errorReason}`
    );

    return NextResponse.json(
      { success: true, message: "Payment failure recorded" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing payment failure:", error);
    return NextResponse.json(
      { success: true, message: "Webhook processed" },
      { status: 200 }
    );
  }
}
