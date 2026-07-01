import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import Participation from "@/models/customerParticipationModel";

// Cooldown period in hours (user can participate again after this many hours)
const PARTICIPATION_COOLDOWN_HOURS = 2;

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

    // Check if there's a recent participation for this customer and campaign
    const lastParticipation = await Participation.findOne({
      campaignId: campaignId,
      customerMobile: customerMobile.trim(),
    })
      .sort({ createdAt: -1 })
      .lean();

    if (lastParticipation) {
      const now = new Date();
      const lastParticipationTime = new Date(lastParticipation.createdAt);
      const timeDiffMs = now - lastParticipationTime;
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      // If last participation was within cooldown period, prevent new participation
      if (timeDiffHours < PARTICIPATION_COOLDOWN_HOURS) {
        const remainingMinutes = Math.ceil(
          (PARTICIPATION_COOLDOWN_HOURS - timeDiffHours) * 60
        );
        return NextResponse.json({
          success: true,
          canParticipate: false,
          participantName: lastParticipation.customerName,
          participationDate: lastParticipation.createdAt,
          remainingMinutes: remainingMinutes,
          message: `You can participate again in ${remainingMinutes} minutes`,
        });
      }
    }

    // User can participate (either first time or cooldown period has passed)
    return NextResponse.json({
      success: true,
      canParticipate: true,
    });
  } catch (error) {
    console.error("Error checking participation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
