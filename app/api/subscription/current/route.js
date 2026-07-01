import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
import "@/models/subscriptionPlanModel";
import Campaign from "@/models/campaignModel";
import Account from "@/models/accountModel";
import { NextResponse } from "next/server";

// GET /api/subscription/current — authenticated account's subscription + live usage
export async function GET() {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  // Determine account type and actual owner ID
  // Managers inherit their parent merchant's subscription
  const isManager = account.role === "Manager";
  const ownerId = isManager ? account.parentId : account._id;

  // Determine owner type based on role
  const ownerType = account.role === "Distributor" ? "distributor" : "merchant";

  const subscription = await Subscription.findOne({
    ownerId,
    ownerType,
    status: { $in: ["trial", "active", "past_due"] },
  })
    .populate("planId")
    .populate("distributorId", "name email profile.companyName");

  if (!subscription) {
    return Response.json(
      { success: true, subscription: null, message: "No active subscription" },
      { status: 200 },
    );
  }

  // Compute live usage based on owner type
  let activeCampaigns, managerCount;

  if (ownerType === "merchant") {
    // For merchants, count active campaigns and managers
    [activeCampaigns, managerCount] = await Promise.all([
      Campaign.countDocuments({ merchantId: ownerId, status: "active" }),
      Account.countDocuments({
        role: "Manager",
        parentId: ownerId,
        status: "active",
      }),
    ]);
  } else {
    // For distributors, just count active campaigns (no managers concept)
    activeCampaigns = 0;
    managerCount = 0;
  }

  const usage = {
    activeCampaigns,
    managers: managerCount,
    scansThisMonth: subscription.usage?.scansThisMonth ?? 0,
  };

  // Resolve plan — fall back to hardcoded plans when planId is null
  const HARDCODED_PLANS = {
    plan_core: {
      _id: "plan_core", name: "Core", displayName: "ScratchX Core", planType: "CORE",
      limits: { maxCampaigns: -1, maxStores: 1, maxScratchesPerCampaign: -1, maxMonthlyScans: -1, maxManagersPerAccount: -1 },
    },
    plan_smart: {
      _id: "plan_smart", name: "Smart", displayName: "ScratchX Smart", planType: "SMART",
      limits: { maxCampaigns: -1, maxStores: 5, maxScratchesPerCampaign: -1, maxMonthlyScans: -1, maxManagersPerAccount: -1 },
    },
  };

  // Always use planType as source of truth for determining the plan
  let plan = null;

  if (subscription.planType) {
    // Use subscription.planType (CORE or SMART) to look up the hardcoded plan
    const planTypeKey = `plan_${subscription.planType.toLowerCase()}`;
    plan = HARDCODED_PLANS[planTypeKey];
  }

  // If no plan found via planType, try planId
  if (!plan && subscription.planId) {
    plan = subscription.planId;
  }

  const planName = plan?.name
    ? plan.name.charAt(0).toUpperCase() + plan.name.slice(1).toLowerCase()
    : subscription.planType
    ? subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1).toLowerCase()
    : null;

  const displayName = plan?.displayName || (planName ? `ScratchX ${planName}` : null);

  console.log('[Current Subscription] Plan determination:', {
    subscriptionPlanType: subscription.planType,
    'plan.displayName': plan?.displayName,
    displayName,
  });

  const limits = plan
    ? {
        maxCampaigns: plan.limits.maxCampaigns,
        maxScansPerMonth: plan.limits.maxMonthlyScans,
        maxManagers: plan.limits.maxManagersPerAccount,
        maxStores: plan.limits.maxStores,
      }
    : null;

  // Check scratch entitlements
  let unlimitedScratchesRemaining = null;
  let unlimitedScratchesValidUntil = null;

  if (
    subscription.unlimitedScratches?.isActive &&
    subscription.unlimitedScratches?.validUntil
  ) {
    const now = new Date();
    const validUntil = new Date(subscription.unlimitedScratches.validUntil);

    if (validUntil > now) {
      const daysRemaining = Math.ceil(
        (validUntil - now) / (24 * 60 * 60 * 1000),
      );
      unlimitedScratchesRemaining = Math.max(0, daysRemaining);
      unlimitedScratchesValidUntil = subscription.unlimitedScratches.validUntil;
    }
  }

  return Response.json(
    {
      success: true,
      subscription,
      planName,
      displayName,
      usage,
      limits,
      ...(unlimitedScratchesRemaining !== null && {
        unlimitedScratchesRemaining,
        unlimitedScratchesValidUntil,
      }),
    },
    { status: 200 },
  );
}
