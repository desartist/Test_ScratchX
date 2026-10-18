import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";
import { configuredCardCount } from "@/lib/services/rewardInventoryService";

/**
 * GET /api/customer/campaign/:id/coupons
 * Fetch available coupons/rewards for a campaign
 * Returns all rewards from all ranges for the customer to select from
 *
 * No authentication required - customer-facing endpoint
 */
export async function GET(request, { params }) {
  try {
    const { id: campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Fetch campaign
    const campaign = await Campaign.findById(campaignId).lean();

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Campaign is not active" },
        { status: 400 },
      );
    }

    // Fetch all ranges for the campaign
    const ranges = await Range.find({ campaignId }).lean();

    // One anonymous card per configured slot, per range.
    //
    // The count is the CONFIGURED number of cards (configuredCardCount) —
    // never the number of active or in-stock rewards, so deactivating a
    // reward or running it out of stock never shrinks the grid.
    //
    // Cards carry no reward details. They are mystery choices; which reward
    // the customer gets is decided server-side when they participate (from
    // eligible rewards only) and shown after the reveal. This endpoint used
    // to return every reward's type, value and description — including
    // inactive ones — to anyone, before scratching.
    const allCoupons = [];
    ranges.forEach((range) => {
      const count = configuredCardCount(campaign, range);
      for (let index = 0; index < count; index++) {
        allCoupons.push({
          id: `${range._id}-${index}`,
          rangeId: range._id,
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          campaign: {
            _id: campaign._id,
            campaignName: campaign.campaignName,
          },
          coupons: allCoupons,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching campaign coupons:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
