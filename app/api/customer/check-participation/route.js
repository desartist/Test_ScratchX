import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Participation from "@/models/customerParticipationModel";

// The customer's reveal/redeem window is 5 minutes (see expires_at in
// /api/customer/participate). Cooldown is an additional 10 minutes on top of
// that, so a customer can participate again 15 minutes after their original
// scan — short on purpose, since customers can visit the store multiple
// times in a single day.
const REVEAL_WINDOW_MINUTES = 5;
const POST_REVEAL_COOLDOWN_MINUTES = 10;
const PARTICIPATION_COOLDOWN_MINUTES = REVEAL_WINDOW_MINUTES + POST_REVEAL_COOLDOWN_MINUTES;

/**
 * POST /api/customer/check-participation
 * Check if customer can participate or must wait for cooldown period
 */
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { campaignId, customerMobile } = body;

    if (!campaignId || !customerMobile) {
      return NextResponse.json(
        { success: false, error: "Campaign ID and customer mobile required" },
        { status: 400 }
      );
    }

    // Check if there's a recent participation for this customer and campaign.
    // Field names must match the model exactly (campaign_id / customer_mobile,
    // snake_case) — this previously queried camelCase fields that don't exist
    // on the schema, so it silently never found a match.
    const lastParticipation = await Participation.findOne({
      campaign_id: campaignId,
      customer_mobile: customerMobile.trim(),
    })
      .sort({ createdAt: -1 })
      .lean();

    if (lastParticipation) {
      const now = new Date();
      const lastParticipationTime = new Date(lastParticipation.createdAt);
      const timeDiffMinutes = (now - lastParticipationTime) / (1000 * 60);

      // If last participation was within cooldown period, prevent new participation
      if (timeDiffMinutes < PARTICIPATION_COOLDOWN_MINUTES) {
        const remainingMinutes = Math.ceil(
          PARTICIPATION_COOLDOWN_MINUTES - timeDiffMinutes
        );
        return NextResponse.json({
          success: true,
          canParticipate: false,
          participantName: lastParticipation.customer_name,
          participationDate: lastParticipation.createdAt,
          remainingMinutes: remainingMinutes,
          message: `You can participate again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`,
        });
      }
    }

    // User can participate (either first time or cooldown period has passed)
    return NextResponse.json({
      success: true,
      canParticipate: true,
      isRepeatCustomer: !!lastParticipation,
    });
  } catch (error) {
    console.error("Error checking participation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
