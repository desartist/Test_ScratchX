import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Store from "@/models/storeModel";
import Notification from "@/models/notificationModel";
import TeamSeatRequest from "@/models/teamSeatRequestModel";
import { EXTRA_SEAT_PRICE_INR } from "@/lib/teamLimits";

// Manager seats are a fixed rule (max 1/store, see lib/teamLimits.js) — not
// purchasable/expandable, so only Staff seats can be requested here.
const REQUESTABLE_ROLES = ["Store_Staff"];
const ROLE_LABELS = { Store_Manager: "Store Manager", Store_Staff: "Store Staff" };

/**
 * GET /api/team/seats/request?storeId=
 * A merchant's own extra-seat requests (optionally scoped to one store) —
 * used by the Team page to show "request pending" state.
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (account.role !== "Merchant") {
      return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");

    const query = { merchantId: account._id };
    if (storeId) query.storeId = storeId;

    const requests = await TeamSeatRequest.find(query).sort({ createdAt: -1 });

    return Response.json({ success: true, requests }, { status: 200 });
  } catch (err) {
    console.error("Error fetching seat requests:", err);
    return Response.json({ success: false, error: "Failed to fetch seat requests" }, { status: 500 });
  }
}

/**
 * POST /api/team/seats/request
 * A merchant requests an extra Store_Manager/Store_Staff seat for a store.
 * No payment is collected here — the merchant's distributor is notified and
 * collects payment manually, then marks the request paid from their panel.
 * Body: { storeId, role, quantity? }
 */
export async function POST(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (account.role !== "Merchant") {
      return Response.json(
        { success: false, error: "Only business owners can request extra team seats" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { storeId, role } = body;
    const quantity = Math.max(1, parseInt(body.quantity, 10) || 1);

    if (role === "Store_Manager") {
      return Response.json(
        { success: false, error: "Manager seats are capped at 1 per store and can't be requested or purchased" },
        { status: 400 }
      );
    }

    if (!storeId || !REQUESTABLE_ROLES.includes(role)) {
      return Response.json(
        { success: false, error: "storeId and a valid role (Store_Staff) are required" },
        { status: 400 }
      );
    }

    const store = await Store.findOne({ _id: storeId, merchant_id: account._id, isDeleted: false });
    if (!store) {
      return Response.json({ success: false, error: "Store not found" }, { status: 404 });
    }

    if (!account.parentId) {
      return Response.json(
        {
          success: false,
          error: "No distributor is linked to your account to handle this request. Contact ScratchX support.",
        },
        { status: 400 }
      );
    }

    // Avoid piling up duplicate pending requests for the same store + role.
    const existingPending = await TeamSeatRequest.findOne({
      merchantId: account._id,
      storeId: store._id,
      role,
      status: "pending",
    });
    if (existingPending) {
      return Response.json({ success: true, request: existingPending, alreadyPending: true }, { status: 200 });
    }

    const unitPriceINR = EXTRA_SEAT_PRICE_INR;
    const totalAmountINR = unitPriceINR * quantity;

    const seatRequest = await TeamSeatRequest.create({
      merchantId: account._id,
      distributorId: account.parentId,
      storeId: store._id,
      role,
      quantity,
      unitPriceINR,
      totalAmountINR,
      status: "pending",
    });

    const roleLabel = ROLE_LABELS[role];
    await Notification.create({
      ownerId: account.parentId,
      ownerType: "distributor",
      type: "team_seat_requested",
      title: "Extra team seat requested",
      message: `${account.name || account.email} wants ${quantity} extra ${roleLabel} seat(s) for ${store.store_name} — ₹${totalAmountINR}. Collect payment and mark it Paid.`,
      actionUrl: "/seat-requests",
      actionText: "Review request",
      severity: "medium",
    }).catch((err) => console.error("[team/seats/request] notification error:", err));

    return Response.json({ success: true, request: seatRequest }, { status: 201 });
  } catch (err) {
    console.error("Error creating seat request:", err);
    return Response.json({ success: false, error: err.message || "Failed to create seat request" }, { status: 500 });
  }
}
