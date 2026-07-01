import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";

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

    // Aggregate all coupons/rewards from all ranges
    const allCoupons = [];
    ranges.forEach((range) => {
      if (range.rewards && Array.isArray(range.rewards)) {
        range.rewards.forEach((reward, index) => {
          allCoupons.push({
            id: `${range._id}-${index}`,
            rangeId: range._id,
            rewardName: reward.type || `₹${reward.value || "0"} Off`,
            couponCode: reward.coupon_code || "",
            description: reward.description || "",
            value: reward.value || 0,
            type: reward.type || "coupon",
            expiryDate: reward.expiry_date,
          });
        });
      }
    });

    // If no coupons found, return mock data for demo purposes
    if (allCoupons.length === 0) {
      // Get first range ID for mock data if available
      const firstRangeId = ranges.length > 0 ? ranges[0]._id : "mockRangeId";

      const mockCoupons = [
        {
          id: "1",
          rangeId: firstRangeId,
          rewardName: "₹50 Off",
          couponCode: "50OFF2025",
          value: 50,
          type: "coupon",
        },
        {
          id: "2",
          rangeId: firstRangeId,
          rewardName: "₹100 Off",
          couponCode: "100OFF2025",
          value: 100,
          type: "coupon",
        },
        {
          id: "3",
          rangeId: firstRangeId,
          rewardName: "₹150 Off",
          couponCode: "150OFF2025",
          value: 150,
          type: "coupon",
        },
        {
          id: "4",
          rangeId: firstRangeId,
          rewardName: "₹200 Off",
          couponCode: "200OFF2025",
          value: 200,
          type: "coupon",
        },
        {
          id: "5",
          rangeId: firstRangeId,
          rewardName: "₹250 Off",
          couponCode: "250OFF2025",
          value: 250,
          type: "coupon",
        },
        {
          id: "6",
          rangeId: firstRangeId,
          rewardName: "₹300 Off",
          couponCode: "300OFF2025",
          value: 300,
          type: "coupon",
        },
      ];

      return NextResponse.json(
        {
          success: true,
          data: {
            campaign: {
              _id: campaign._id,
              campaignName: campaign.campaignName,
            },
            coupons: mockCoupons,
          },
        },
        { status: 200 },
      );
    }

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
