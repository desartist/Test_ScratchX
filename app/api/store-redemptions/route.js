import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import CustomerParticipation from "@/models/customerParticipationModel";
import ScratchCardRecord from "@/models/scratchCardRecordModel";
import RedemptionService from "@/lib/redemptionService";
import { isExpired } from "@/lib/services/expiryManagementService";
import { NotFoundError, ValidationError } from "@/lib/errors";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-redemptions?phone=...
 * Look up a customer's scratch card(s) at this store by phone number — the
 * only searchable identity in the data model (no coupon-code field exists).
 * Both Store_Manager and Store_Staff can search; only Store_Staff can redeem
 * (see POST below), matching lib/permissions.js's scan:read vs scan:redeem.
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (!STORE_TEAM_ROLES.includes(account.role)) {
      return Response.json(
        { success: false, error: "This page is for store team accounts only" },
        { status: 403 }
      );
    }

    if (!account.storeId) {
      return Response.json(
        { success: false, error: "No store is assigned to this account. Contact your business owner." },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return Response.json(
        { success: false, error: "phone is required" },
        { status: 400 }
      );
    }

    const participations = await CustomerParticipation.find({
      store_id: account.storeId,
      customer_mobile: phone,
    })
      .populate("scratch_card_id", "status expires_at redeemed_at")
      .populate("campaign_id", "campaignName")
      .sort({ createdAt: -1 });

    const cards = participations
      .filter((p) => p.scratch_card_id)
      .map((p) => ({
        participationId: p._id,
        customerName: p.customer_name,
        campaignId: p.campaign_id?._id || null,
        campaignName: p.campaign_id?.campaignName || null,
        scratchCardId: p.scratch_card_id._id,
        status: p.scratch_card_id.status,
        expired: isExpired(p.scratch_card_id),
        expiresAt: p.scratch_card_id.expires_at,
        redeemedAt: p.scratch_card_id.redeemed_at,
      }));

    return Response.json({ success: true, cards }, { status: 200 });
  } catch (err) {
    console.error("Error searching store redemptions:", err);
    return Response.json(
      { success: false, error: "Failed to search for customer cards" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/store-redemptions
 * Body: { scratchCardId }
 * Store_Staff only (scan:redeem). Validates the card belongs to this store,
 * isn't expired, and is in 'revealed' status (same checks the customer's own
 * self-redeem route uses — app/api/customer/scratch/redeem/route.js), then
 * decrements the campaign/store-mapping counters via RedemptionService
 * (already correct for that side) and flips the card + participation status
 * to 'redeemed' (which RedemptionService itself doesn't do — see plan notes).
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (account.role !== "Store_Staff") {
      return Response.json(
        { success: false, error: "Only Store Staff can redeem scratch cards" },
        { status: 403 }
      );
    }

    if (!account.storeId || !account.parentId) {
      return Response.json(
        { success: false, error: "No store is assigned to this account. Contact your business owner." },
        { status: 404 }
      );
    }

    const { scratchCardId } = await request.json();
    if (!scratchCardId) {
      return Response.json(
        { success: false, error: "scratchCardId is required" },
        { status: 400 }
      );
    }

    const scratchCard = await ScratchCardRecord.findById(scratchCardId);
    if (!scratchCard) {
      return Response.json(
        { success: false, error: "Scratch card not found" },
        { status: 404 }
      );
    }

    if (String(scratchCard.store_id) !== String(account.storeId)) {
      return Response.json(
        { success: false, error: "This card does not belong to your store" },
        { status: 403 }
      );
    }

    if (isExpired(scratchCard)) {
      return Response.json(
        { success: false, error: "Scratch card has expired and cannot be redeemed" },
        { status: 400 }
      );
    }

    if (scratchCard.status !== "revealed") {
      return Response.json(
        {
          success: false,
          error: `Scratch card must be in 'revealed' status to redeem. Current status: ${scratchCard.status}`,
        },
        { status: 400 }
      );
    }

    const participation = await CustomerParticipation.findById(scratchCard.customer_participation_id);
    if (!participation) {
      return Response.json(
        { success: false, error: "Participation record not found" },
        { status: 404 }
      );
    }

    const result = await RedemptionService.redeemScratchCard(
      account.parentId,
      scratchCard.campaign_id,
      account.storeId,
      String(scratchCard._id),
      account._id,
      "Redeemed by store staff"
    );

    scratchCard.status = "redeemed";
    scratchCard.redeemed_at = new Date();
    await scratchCard.save();

    participation.status = "redeemed";
    participation.redeemed_at = new Date();
    await participation.save();

    return Response.json(
      {
        success: true,
        message: "Reward redeemed successfully",
        redemption: result.redemption,
        inventory: result.inventory,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error redeeming scratch card:", err);
    if (err instanceof NotFoundError) {
      return Response.json({ success: false, error: err.message }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return Response.json({ success: false, error: err.message }, { status: 400 });
    }
    return Response.json(
      { success: false, error: "Failed to redeem scratch card" },
      { status: 500 }
    );
  }
}
