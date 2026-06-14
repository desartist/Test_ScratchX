import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import { enforceFeatureLimit } from "@/lib/subscriptionGuard";
import subscriptionValidationService from "@/lib/services/subscriptionValidationService";
import subscriptionStatusGuard from "@/lib/guards/subscriptionStatusGuard";
import { checkScratchEntitlement } from "@/lib/guards/scratchEntitlementGuard";
import platformAccessService from "@/lib/services/platformAccessService";
import Campaign from "@/models/campaignModel.js";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  const { account, error } = await requireAuth("campaign:read");
  if (error) return error;

  // Manager sees their parent merchant's campaigns
  const merchantId =
    account.role === "Manager" ? account.parentId : account._id;

  const campaigns = await Campaign.find({ merchantId }).sort({ createdAt: -1 });
  return Response.json({ success: true, campaigns }, { status: 200 });
}

export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth("campaign:create");
  if (error) return error;

  if (account.role !== "Merchant") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // ========== CHECK CAMPAIGN CREATION ELIGIBILITY (PLAN + SCRATCHES) ==========
  const canCreateCheck = await platformAccessService.canCreateCampaign(account._id);

  if (!canCreateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: canCreateCheck.reason },
      { status: 403 }
    );
  }

  // ========== ✅ PHASE 2: CHECK SUBSCRIPTION STATUS ==========
  // Verify subscription is not expired
  const statusCheck = await subscriptionStatusGuard.checkSubscriptionStatus(
    account._id,
    "merchant"
  );

  if (!statusCheck.isActive) {
    return NextResponse.json(
      {
        success: false,
        error: statusCheck.message,
        blockCampaignOperations: true,
        expiryDate: statusCheck.expiryDate,
        daysOverdue: statusCheck.daysOverdue,
        actionRequired: "Renew Subscription",
        actionUrl: "/billing/plans",
      },
      { status: 402 } // Payment Required
    );
  }

  // ========== CHECK SCRATCH ENTITLEMENT ==========
  const scratchCheck = await checkScratchEntitlement(account._id, "merchant");

  if (!scratchCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: scratchCheck.message,
        blockCampaignOperations: true,
        actionRequired: scratchCheck.actionRequired,
        actionUrl: scratchCheck.actionUrl,
      },
      { status: 403 }
    );
  }

  // Validate subscription allows campaign creation
  const canCreate = await subscriptionValidationService.canCreateCampaign(
    account._id,
    "merchant"
  );

  if (!canCreate.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: canCreate.message,
        details: {
          limit: canCreate.limit,
          current: canCreate.current,
        },
      },
      { status: 403 }
    );
  }

  const campaignData = await request.json();
  const campaign = await Campaign.create({
    ...campaignData,
    merchantId: account._id,
  });

  return NextResponse.json({ success: true, campaign }, { status: 201 });
}
