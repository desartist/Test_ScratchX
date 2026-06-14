import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";

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

    // Connect to database
    await connectDB();

    // Fetch and validate campaign
    const campaign = await Campaign.findById(campaignId).lean();

    // Return 404 if not found
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Validate campaign.status === 'active' (return 400 if not)
    if (campaign.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Campaign is not active" },
        { status: 400 },
      );
    }

    // Check now is between startDate and endDate (return 400 if not)
    const now = new Date();
    console.log(
      "Campaign dates:",
      campaign.startDate,
      campaign.endDate,
      "Now:",
      now,
    );
    if (now < campaign.startDate || now > campaign.endDate) {
      return NextResponse.json(
        { success: false, error: "Campaign is not currently running" },
        { status: 400 },
      );
    }

    // Fetch billing ranges sorted by minAmount
    const ranges = await Range.find({ campaignId })
      .sort({ minAmount: 1 })
      .lean();
    console.log(ranges, "ranges");

    // Format and return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          campaign: campaign,
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
