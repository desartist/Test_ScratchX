/**
 * POST /api/payment/create-order
 * Create a Razorpay order for subscription payment
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Payment from "@/models/paymentModel";
import razorpay from "@/lib/razorpay";
import mockPaymentService from "@/lib/mockPaymentService";
import crypto from "crypto";

// Hardcoded plans matching frontend
const HARDCODED_PLANS = {
  CORE: {
    id: "single-store",
    name: "Single Store",
    price: 2099,
    originalPrice: 2999,
  },
  SMART: {
    id: "multi-store",
    name: "Multi-Store",
    price: 2999,
    originalPrice: 4999,
  },
};

export async function POST(request) {
  try {
    await connectDB();

    // Authenticate user
    const { account, error: authError } = await requireAuth();
    if (authError) {
      return authError;
    }

    // Parse request
    const body = await request.json();
    const { planName, amount, merchantEmail } = body;

    const merchantId = account._id;

    if (!planName) {
      return NextResponse.json(
        {
          success: false,
          error: "planName is required",
        },
        { status: 400 },
      );
    }

    // Get plan from hardcoded list
    const plan = HARDCODED_PLANS[planName];
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: `Plan "${planName}" not found`,
        },
        { status: 404 },
      );
    }

    // Use provided amount or plan price
    const finalAmount = amount || plan.price;

    if (finalAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot create payment order for free plans",
        },
        { status: 400 },
      );
    }

    // Create Razorpay order (or mock order if test mode enabled)
    // Amount should be in paise (multiply by 100)
    let razorpayOrder;

    if (mockPaymentService.isTestModeEnabled()) {
      console.log('✓ Using mock payment for testing');
      razorpayOrder = mockPaymentService.createMockOrder({
        amount: finalAmount * 100,
        currency: "INR",
        receipt: `order_${merchantId}_${Date.now()}`,
        notes: {
          planName: planName,
          merchantId: merchantId.toString(),
          testMode: true,
        },
      });
    } else {
      razorpayOrder = await razorpay.orders.create({
        amount: finalAmount * 100,
        currency: "INR",
        receipt: `order_${merchantId}_${Date.now()}`,
        notes: {
          planName: planName,
          merchantId: merchantId.toString(),
        },
      });
    }

    // Save payment record
    const payment = new Payment({
      merchantId,
      planName,
      amount: finalAmount,
      currency: "INR",
      gatewayOrderId: razorpayOrder.id,
      status: "created",
      paymentMethod: "razorpay",
      metadata: {
        originalPrice: plan.originalPrice,
        discount: plan.originalPrice - finalAmount,
      },
    });

    await payment.save();

    // Return response with Razorpay credentials
    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: finalAmount * 100, // Return in paise
          currency: "INR",
          paymentId: payment._id.toString(),
          razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          planName,
          merchantEmail,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error creating payment order:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error creating payment order",
      },
      { status: 500 },
    );
  }
}
