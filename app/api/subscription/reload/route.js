import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
import "@/models/subscriptionPlanModel";
import { NextResponse } from "next/server";

// POST /api/subscription/reload — reload plan state (called after payment)
export async function POST() {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    // Determine account type and owner
    const isManager = account.role === "Manager";
    const ownerId = isManager ? account.parentId : account._id;
    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";

    // Fetch fresh subscription from DB
    const subscription = await Subscription.findOne({
      ownerId,
      ownerType,
      status: { $in: ["trial", "active", "past_due"] },
    })
      .populate("planId")
      .lean();

    if (!subscription) {
      return NextResponse.json(
        { success: false, message: "No active subscription found" },
        { status: 404 }
      );
    }

    // Return confirmation that plan has been reloaded
    return NextResponse.json(
      {
        success: true,
        message: "Plan reloaded successfully",
        planType: subscription.planType,
        status: subscription.status,
        updatedAt: subscription.updatedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[subscription/reload] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to reload plan" },
      { status: 500 }
    );
  }
}
