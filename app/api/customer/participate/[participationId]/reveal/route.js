import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connectDB";
import CustomerParticipation from "@/models/customerParticipationModel";
import ScratchCardRecord from "@/models/scratchCardRecordModel";
import { redeemInventory } from "@/lib/services/inventoryManagementService";

/**
 * POST /api/customer/participate/[participationId]/reveal
 * Mark participation as revealed and update redeemed inventory counts
 * Called when customer scratches the card
 * NOTE: MongoDB transactions removed for standalone development instances
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { participationId } = await params;
    const { scratchCardId } = await request.json();

    console.log("📌 Reveal request:", { participationId, scratchCardId });

    // Validate participationId format
    if (!participationId || !mongoose.Types.ObjectId.isValid(participationId)) {
      console.error("❌ Invalid participation ID format:", participationId);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid participation ID format: ${participationId}`,
        },
        { status: 400 },
      );
    }

    // Find participation (without session/transaction)
    const participation = await CustomerParticipation.findById(participationId);

    if (!participation) {
      console.error("❌ Participation not found in database:", {
        participationId,
        searchedId: new mongoose.Types.ObjectId(participationId),
      });

      // Try to get all participations to debug
      const allParticipations = await CustomerParticipation.find({})
        .limit(5)
        .lean();
      console.log(
        "📊 Sample participations in database:",
        allParticipations.map((p) => ({
          id: p._id,
          status: p.status,
          customer: p.customer_name,
        })),
      );

      return NextResponse.json(
        {
          success: false,
          error: `Participation not found with ID: ${participationId}`,
        },
        { status: 404 },
      );
    }

    console.log("✅ Participation found:", {
      participationId: participation._id,
      currentStatus: participation.status,
      campaignId: participation.campaign_id,
    });

    // Check if already revealed
    if (
      participation.status === "revealed" ||
      participation.status === "redeemed"
    ) {
      return NextResponse.json(
        { success: false, error: "Reward already revealed" },
        { status: 400 },
      );
    }

    // Save the won reward ID so it's permanently linked to this participation
    if (scratchCardId && mongoose.Types.ObjectId.isValid(scratchCardId)) {
      participation.reward_id = new mongoose.Types.ObjectId(scratchCardId);
    }

    // Update participation status to revealed
    participation.status = "revealed";
    participation.revealed_at = new Date();
    await participation.save();

    console.log("✅ Participation status updated to revealed");

    // Update redeemed counts using inventory service
    // Only increment redeemed_scratch_cards AFTER reward is revealed
    console.log("🎁 Updating redeemed inventory counts:", {
      campaignId: participation.campaign_id,
      merchantId: participation.merchant_id,
    });

    const redeemResult = await redeemInventory(
      participation.campaign_id,
      participation.merchant_id,
      participation.merchant_id,
      request.headers.get("x-forwarded-for") || "unknown",
    );

    if (!redeemResult.success) {
      console.error("❌ Redemption failed:", redeemResult.error);
      return NextResponse.json(
        { success: false, error: "Failed to update redeem counts" },
        { status: 400 },
      );
    }

    console.log("✅ Redeemed counts updated successfully:", {
      campaignId: participation.campaign_id,
      merchantId: participation.merchant_id,
    });

    return NextResponse.json(
      {
        success: true,
        data: { status: "revealed", revealedAt: participation.revealed_at },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error in reveal endpoint:", error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
          data: null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        data: null,
      },
      { status: 500 },
    );
  }
}
