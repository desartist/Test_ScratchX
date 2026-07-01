/**
 * POST /api/subscription/assign
 * Assign a subscription plan to a merchant
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { getLoginToken } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
import SubscriptionPlan from "@/models/subscriptionPlanModel";
import SubscriptionUsage from "@/models/subscriptionUsageModel";

export async function POST(request) {
  try {
    await connectDB();

    // Authenticate
    const authToken = await getLoginToken();
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const requestorRole = authToken.role;
    if (!["Super_Admin", "Distributor"].includes(requestorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only Super_Admin or Distributor can assign subscriptions",
        },
        { status: 403 }
      );
    }

    // Parse request
    const body = await request.json();
    const { merchantId, planName, billingCycle = "monthly", distributorId } = body;

    // Validate
    if (!merchantId || !planName) {
      return NextResponse.json(
        {
          success: false,
          error: "merchantId and planName are required",
        },
        { status: 400 }
      );
    }

    // Check plan
    const plan = await SubscriptionPlan.findOne({ name: planName });
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: `Plan "${planName}" not found`,
        },
        { status: 404 }
      );
    }

    // Check existing subscription
    const existingSubscription = await Subscription.findOne({
      merchantId,
      status: { $in: ["trial", "active"] },
    });

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: "Merchant already has an active subscription",
        },
        { status: 409 }
      );
    }

    // Calculate dates
    const now = new Date();
    const currentPeriodStart = now;
    let currentPeriodEnd;
    let trialEndsAt = null;

    if (billingCycle === "annual") {
      currentPeriodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    if (plan.isTrialPlan) {
      trialEndsAt = new Date(
        now.getTime() + plan.trialDurationDays * 24 * 60 * 60 * 1000
      );
    }

    // Create subscription
    const subscription = new Subscription({
      merchantId,
      planId: plan._id,
      distributorId: distributorId || null,
      status: plan.isTrialPlan ? "trial" : "active",
      billingCycle,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt,
    });

    const savedSubscription = await subscription.save();

    // Create usage record
    const usage = new SubscriptionUsage({
      subscriptionId: savedSubscription._id,
      merchantId,
      billingPeriod: {
        startDate: currentPeriodStart,
        endDate: currentPeriodEnd,
      },
      isActive: true,
    });

    await usage.save();

    return NextResponse.json(
      {
        success: true,
        message: `${plan.name} plan assigned successfully`,
        data: {
          subscriptionId: savedSubscription._id,
          planName: plan.name,
          status: savedSubscription.status,
          trialEndsAt,
          currentPeriodEnd,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error assigning subscription:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error assigning subscription",
      },
      { status: 500 }
    );
  }
}
