import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import CustomerParticipation from "@/models/customerParticipationModel";
import RedemptionService from "@/lib/redemptionService";
import { isExpired } from "@/lib/services/expiryManagementService";
import { NotFoundError, ValidationError, AuthorizationError, ConflictError } from "@/lib/errors";
import { CASHIER_REDEMPTION_ENABLED } from "@/lib/featureFlags";
import { displayStatus, redeemedAtOf } from "@/lib/redemptionStatus";

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
      .populate("scratch_card_id", "status expires_at revealed_at redeemed_at")
      .populate({ path: "campaign_id", select: "campaignName", options: { includeDeleted: true } })
      .sort({ createdAt: -1 });

    const cards = participations
      .filter((p) => p.scratch_card_id)
      .map((p) => {
        // A scratched coupon shows as redeemed while there's no cashier.
        const status = displayStatus(p.scratch_card_id.status);
        return {
          participationId: p._id,
          customerName: p.customer_name,
          campaignId: p.campaign_id?._id || null,
          campaignName: p.campaign_id?.campaignName || null,
          scratchCardId: p.scratch_card_id._id,
          status,
          // A redeemed coupon is done — it can't also read as expired.
          expired: status === "redeemed" ? false : isExpired(p.scratch_card_id),
          expiresAt: p.scratch_card_id.expires_at,
          redeemedAt: redeemedAtOf(p.scratch_card_id),
        };
      });

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
 * Store_Staff only (scan:redeem). All validation and every write lives in
 * RedemptionService.redeemScratchCard, which is atomic: the card is claimed
 * with a single conditional update (so a double-tap or retry can't redeem
 * twice), a quantity-limited reward's stock is decremented only here — on a
 * successful redemption — and any failure rolls everything back.
 *
 * Only the scratchCardId is taken from the request. The campaign, store
 * and reward all come from the server-side card record, so a client can't
 * point a redemption at another reward's stock.
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    // Cashier redemption is switched off (lib/featureFlags.js): the coupon
    // already counts as redeemed when the customer scratches it, and its
    // stock was taken then. Everything below is kept intact for when the
    // cashier system goes live.
    if (!CASHIER_REDEMPTION_ENABLED) {
      return Response.json(
        {
          success: false,
          error: "Counter redemption is not in use. Coupons are redeemed automatically when the customer scratches them.",
          code: "CASHIER_REDEMPTION_DISABLED",
        },
        { status: 403 }
      );
    }

    if (account.role !== "Store_Staff") {
      return Response.json(
        { success: false, error: "Only Store Staff can redeem scratch cards" },
        { status: 403 }
      );
    }

    if (!account.storeId) {
      return Response.json(
        { success: false, error: "No store is assigned to this account. Contact your business owner." },
        { status: 404 }
      );
    }

    const { scratchCardId } = await request.json().catch(() => ({}));
    if (!scratchCardId) {
      return Response.json(
        { success: false, error: "scratchCardId is required" },
        { status: 400 }
      );
    }

    const result = await RedemptionService.redeemScratchCard(
      account.parentId,
      null, // campaign comes from the card itself
      account.storeId,
      String(scratchCardId),
      account._id,
      "Redeemed by store staff"
    );

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
    if (err instanceof ConflictError) {
      // ALREADY_REDEEMED or OUT_OF_STOCK — nothing was changed.
      if (err.code === "OUT_OF_STOCK") {
        console.warn("[store-redemptions] Redemption refused — reward out of stock");
      }
      return Response.json({ success: false, error: err.message, code: err.code }, { status: 409 });
    }
    if (err instanceof NotFoundError) {
      return Response.json({ success: false, error: err.message }, { status: 404 });
    }
    if (err instanceof AuthorizationError) {
      return Response.json({ success: false, error: err.message }, { status: 403 });
    }
    if (err instanceof ValidationError) {
      return Response.json({ success: false, error: err.message }, { status: 400 });
    }
    console.error("Error redeeming scratch card:", err);
    return Response.json(
      { success: false, error: "Failed to redeem scratch card" },
      { status: 500 }
    );
  }
}
