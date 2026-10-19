import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connectDB";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";
import Account from "@/models/accountModel";

/**
 * GET /api/customer/campaign/:id
 * Fetch campaign details and billing ranges for customer view
 *
 * Returns campaign info and all associated billing ranges if campaign is:
 * - Active status
 * - Within date range (now between startDate and endDate)
 *
 * No authentication required - customer-facing endpoint
 */
export async function GET(request, { params }) {
  try {
    // Extract campaignId from params
    const { id: campaignId } = await params;

    // Return 400 if campaignId is missing
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required" },
        { status: 400 },
      );
    }

    // A malformed id in the QR link is just "not found", not a server error.
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Connect to database
    await connectDB();

    // Fetch and validate campaign
    const campaign = await Campaign.findById(campaignId).lean();

    // Return 404 if not found (archived campaigns are hidden by the model too)
    if (!campaign) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", error: "Campaign not found" },
        { status: 404 },
      );
    }

    // When the campaign can't be played, tell the customer WHY: a reason
    // code plus just enough to explain it (name, store, dates) — never the
    // rewards, ranges or counters.
    const activeStore = (campaign.assignedStores || []).find((s) => s?.status === "active");
    const publicInfo = {
      campaignName: campaign.campaignName,
      storeName: activeStore?.storeName || null,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    };
    const unavailable = (code, error) =>
      NextResponse.json({ success: false, code, error, data: { campaign: publicInfo } }, { status: 400 });

    // Check campaign dates - allow ended campaigns to show nice message to customers
    const now = new Date();
    const isStarted = now >= campaign.startDate;
    const hasEnded = now > campaign.endDate;

    console.log(
      "Campaign dates:",
      campaign.startDate,
      campaign.endDate,
      "Now:",
      now,
      "HasEnded:",
      hasEnded,
    );

    // Not launched yet (no QR generated) — whatever its dates.
    if (campaign.status === "draft") {
      return unavailable("NOT_LIVE", "This campaign isn't live yet");
    }

    // Launched, but its start date is still ahead.
    if (!isStarted) {
      return unavailable("NOT_STARTED", "Campaign has not started yet");
    }

    // Allow ended campaigns to return data so frontend can show nice ended message
    // Only reject if campaign status is not active AND hasn't ended (e.g. paused)
    if (campaign.status !== "active" && !hasEnded) {
      return campaign.status === "paused"
        ? unavailable("PAUSED", "Campaign is paused")
        : unavailable("NOT_LIVE", "Campaign is not active");
    }

    // Fetch billing ranges sorted by minAmount
    const ranges = await Range.find({ campaignId })
      .sort({ minAmount: 1 })
      .lean();
    console.log(ranges, "ranges");

    // Wholesale merchants sell in bulk to other businesses rather than
    // walk-in customers, so the "is the customer physically at the store"
    // GPS check doesn't apply to their campaigns — flag it here so the
    // customer-facing scan page can skip location capture entirely.
    const merchant = await Account.findById(campaign.merchantId)
      .select("profile.businessModel")
      .lean();
    const isWholesale = merchant?.profile?.businessModel === "Wholesale";

    // Format and return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          campaign: { ...campaign, isWholesale },
          // campaign: {
          //   _id: campaign._id,
          //   campaignName: campaign.campaignName,
          //   description: campaign.description,
          //   status: campaign.status,
          //   startDate: campaign.startDate,
          //   endDate: campaign.endDate,
          //   storeId: campaign.storeId
          // },
          ranges: ranges.map((r) => ({
            _id: r._id,
            minAmount: r.minAmount,
            maxAmount: r.maxAmount,
            label: r.label,
            rewardCount: r.rewards?.length || 0,
            rewards: r.rewards,
          })),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
