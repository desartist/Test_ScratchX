import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import ScratchAllocationRequest from "@/models/scratchAllocationRequestModel";
import Campaign from "@/models/campaignModel";
import Store from "@/models/storeModel";
import Notification from "@/models/notificationModel";

/**
 * GET /api/merchant/scratch-requests
 * List scratch allocation requests for the owning merchant.
 * Optional query: ?status=pending|approved|rejected
 */
export async function GET(request) {
  try {
    await connectDB();

    const { account, error } = await requireAuth();
    if (error) return error;

    const ownerMerchantId =
      account.role === "Manager" && account.parentId
        ? account.parentId
        : account._id;

    const status = request.nextUrl.searchParams.get("status");

    const query = { merchantId: ownerMerchantId };
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const data = await ScratchAllocationRequest.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[scratch-requests][GET] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scratch allocation requests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/scratch-requests
 * A Manager (or Merchant) submits a request to allocate scratches to a
 * campaign-store. Creates the request in 'pending' state and notifies the
 * owning merchant.
 */
export async function POST(request) {
  try {
    await connectDB();

    const { account, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { campaignId, storeId, quantity, reason, priority } = body || {};

    if (!campaignId || !storeId || quantity === undefined || quantity === null) {
      return NextResponse.json(
        { success: false, error: "campaignId, storeId and quantity are required" },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json(
        { success: false, error: "quantity must be a number >= 1" },
        { status: 400 }
      );
    }

    const normalizedPriority = ["low", "medium", "high"].includes(priority)
      ? priority
      : "medium";

    // requestedBy = the submitting user; merchant owner = parent if Manager.
    const merchantId =
      account.role === "Manager" && account.parentId
        ? account.parentId
        : account._id;

    // Validate campaign belongs to the merchant owner.
    const campaign = await Campaign.findOne({ _id: campaignId, merchantId });
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found for this merchant" },
        { status: 404 }
      );
    }

    // Validate store belongs to the merchant owner (store field is merchant_id).
    const store = await Store.findOne({ _id: storeId, merchant_id: merchantId });
    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found for this merchant" },
        { status: 404 }
      );
    }

    const campaignName = campaign.campaignName || "";
    const storeName = store.store_name || "";
    const requestedByName =
      account.name ||
      [account.firstName, account.lastName].filter(Boolean).join(" ") ||
      account.email ||
      "";

    const created = await ScratchAllocationRequest.create({
      merchantId,
      requestedBy: account._id,
      campaignId,
      storeId,
      campaignName,
      storeName,
      requestedByName,
      quantity: qty,
      reason: reason || "",
      priority: normalizedPriority,
      status: "pending",
    });

    // Notify the merchant owner. Never let notification failure break the request.
    try {
      const severity =
        normalizedPriority === "high"
          ? "high"
          : normalizedPriority === "low"
          ? "low"
          : "medium";

      await Notification.create({
        ownerId: merchantId,
        ownerType: "merchant",
        type: "other",
        title: "Scratch Allocation Request",
        message: `${requestedByName} requested ${qty} scratches for ${campaignName} @ ${storeName}`,
        severity,
        actionUrl: "/dashboard",
        read: false,
      });
    } catch (notifyErr) {
      console.error(
        "[scratch-requests][POST] Notification creation failed:",
        notifyErr
      );
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error("[scratch-requests][POST] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create scratch allocation request" },
      { status: 500 }
    );
  }
}
