import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { getCooldown } from "@/lib/participationCooldown";

/**
 * POST /api/customer/check-participation
 * Check if customer can participate or must wait for cooldown period.
 *
 * Only a REVEALED coupon starts the cooldown (see lib/participationCooldown.js).
 * Submitting the form and going back without scratching does not.
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

    const cooldown = await getCooldown(campaignId, customerMobile.trim());

    if (cooldown.inCooldown) {
      const { remainingMinutes } = cooldown;
      return NextResponse.json({
        success: true,
        canParticipate: false,
        participantName: cooldown.last.customer_name,
        // When they revealed (scratched) the coupon — the screen reads
        // "You scratched a coupon <time>", so this must be the reveal time,
        // not the time they first submitted the form.
        participationDate: cooldown.revealedAt,
        remainingMinutes,
        message: `You can participate again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`,
      });
    }

    // First time, cooldown passed, or only unrevealed attempts so far.
    return NextResponse.json({
      success: true,
      canParticipate: true,
      isRepeatCustomer: !!cooldown.last,
    });
  } catch (error) {
    console.error("Error checking participation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
