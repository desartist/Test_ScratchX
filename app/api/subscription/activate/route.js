/**
 * POST /api/subscription/activate
 *
 * Create a Razorpay order for ONE-TIME LIFETIME plan payment
 * Validates plan and returns order details for frontend to initiate Razorpay checkout
 * Actual subscription is created after payment verification
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import razorpay from "@/lib/razorpay";
import Payment from "@/models/paymentModel";
import SubscriptionPlan from "@/models/subscriptionPlanModel";

export async function POST(request) {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { success: false, error: "planId is required" },
        { status: 400 },
      );
    }

    const merchantId = account._id;
    const merchantEmail = account.profile?.email || account.email || "";

    // Hardcoded plan definitions (single source of truth, mirrors /api/subscription/plans)
    const HARDCODED_PLANS = {
      plan_core: {
        _id: "plan_core",
        name: "Core",
        displayName: "ScratchX Core",
        planType: "CORE",
        isActive: true,
        price: { base: 2099, withGST: Math.ceil(2099 * 1.18) },
        limits: { maxStores: 1 },
      },
      plan_smart: {
        _id: "plan_smart",
        name: "Smart",
        displayName: "ScratchX Smart",
        planType: "SMART",
        isActive: true,
        price: { base: 2999, withGST: Math.ceil(2999 * 1.18) },
        limits: { maxStores: 5 },
      },
    };

    // Fetch and validate the plan — DB first, hardcoded fallback
    let plan = null;

    // Check if planId is a valid MongoDB ObjectId
    if (planId.match(/^[0-9a-fA-F]{24}$/)) {
      plan = await SubscriptionPlan.findById(planId);
    }

    // Try by name in DB
    if (!plan) {
      const planName = planId.replace(/^plan_/, "").toLowerCase();
      plan = await SubscriptionPlan.findOne({
        name: { $regex: planName, $options: "i" },
      });
    }

    // Fall back to hardcoded definitions (plans not seeded in DB)
    if (!plan) {
      plan = HARDCODED_PLANS[planId] || HARDCODED_PLANS[planId.toLowerCase()];
      if (!plan) {
        // Try matching by stripping the plan_ prefix
        const key = `plan_${planId.replace(/^plan_/, "").toLowerCase()}`;
        plan = HARDCODED_PLANS[key];
      }
    }

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 },
      );
    }

    // Use plan's price with GST as total
    // Convert Mongoose subdocument to plain object if needed
    const priceObj = plan.price?.toObject?.() || plan.price || {};
    const amount = priceObj["withGST"] || priceObj["base"] || 0;
    console.log(
      `[Activate] Plan found: ${plan.name}, withGST: ${priceObj["withGST"]}, base: ${priceObj["base"]}, Amount: ${amount}`,
    );

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Cannot create payment for free plans" },
        { status: 400 },
      );
    }

    // Create Razorpay order
    // Amount must be in paise (multiply by 100)
    // Receipt must be <= 40 chars
    const timestamp = Date.now().toString().slice(-8);
    const merchantIdShort = merchantId.toString().slice(-6);
    const receipt = `ord_${merchantIdShort}_${timestamp}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: receipt,
      notes: {
        planId: planId.toString(),
        planName: plan.name,
        merchantId: merchantId.toString(),
        type: "subscription",
      },
    });

    // Determine planType from plan name (CORE or SMART)
    let planType = "CORE";
    if (plan.name?.toUpperCase().includes("SMART")) {
      planType = "SMART";
    } else if (
      plan.name?.toUpperCase().includes("CORE") ||
      plan.name?.toUpperCase().includes("SINGLE")
    ) {
      planType = "CORE";
    }

    // Only store planId if it's a real MongoDB ObjectId (not a hardcoded string like "plan_smart")
    const isRealObjectId = plan._id && /^[0-9a-fA-F]{24}$/.test(plan._id.toString());

    // Save payment record
    const payment = new Payment({
      merchantId,
      planId: isRealObjectId ? plan._id : null,
      amount: priceObj.base || 0,
      tax: (priceObj.withGST || 0) - (priceObj.base || 0),
      totalAmount: amount,
      currency: "INR",
      paymentGateway: "razorpay",
      gatewayOrderId: razorpayOrder.id,
      transactionId: razorpayOrder.id, // Use Razorpay order ID as transaction ID
      status: "created",
      paymentMethod: "razorpay",
      metadata: {
        planName: plan.name,
        planType: planType,
      },
    });

    await payment.save();

    console.log(
      `✓ [Razorpay Order] Created order ${razorpayOrder.id} for plan ${plan.name}`,
    );

    // Return order details to frontend
    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: Math.round(amount * 100), // Return in paise
          currency: "INR",
          paymentId: payment._id.toString(),
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          planId: planId.toString(),
          planName: plan.name,
          merchantEmail,
          description: `${plan.displayName || plan.name} Plan - Lifetime Access`,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Subscription Activate] Error:", error);

    // User-friendly error messages
    let userMessage = "Failed to create payment order. Please try again.";
    let developmentDetails = error.message;

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      userMessage = `Payment record already exists. Please try again or contact support.`;
      developmentDetails = `Duplicate key error on field '${field}': ${error.message}`;
    }

    // Handle Razorpay errors
    if (error.message?.includes("BAD_REQUEST")) {
      userMessage = "Invalid payment configuration. Please try again.";
      developmentDetails = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage, // User-friendly message
        // Development details (only for debugging)
        ...(process.env.NODE_ENV === "development" && {
          details: developmentDetails,
          code: error.code,
          stack: error.stack,
        }),
      },
      { status: 500 },
    );
  }
}
