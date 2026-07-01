import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import StoreService from "@/lib/storeService";
import Campaign from "@/models/campaignModel";
import Range from "@/models/rangeModel";
import CustomerParticipation from "@/models/customerParticipationModel";
import { hasPermission } from "@/lib/permissions";
import { ValidationError, NotFoundError } from "@/lib/errors";

/**
 * Cast a value to a mongoose ObjectId when it is a valid id string.
 * Aggregation/$elemMatch on an ObjectId field needs a real ObjectId,
 * not a string.
 */
function toObjId(id) {
  if (
    mongoose.Types.ObjectId.isValid(id) &&
    !(id instanceof mongoose.Types.ObjectId)
  ) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
}

/**
 * Derive the campaigns assigned to a store from the CAMPAIGN side, which is
 * the source of truth (campaign.assignedStores[]). The denormalized
 * store.assignedCampaigns cache is stale for some assignment paths, so we
 * read the campaigns directly and map them into the shape the store detail
 * page's AssignedCampaignsList component expects.
 *
 * @param {mongoose.Types.ObjectId|string} merchantId - store's merchant id
 * @param {mongoose.Types.ObjectId|string} storeId - the store's _id
 * @returns {Promise<Array>} mapped assigned campaign objects
 */
async function deriveAssignedCampaigns(merchantId, storeId) {
  const storeObjId = toObjId(storeId);

  const campaigns = await Campaign.find({
    merchantId: toObjId(merchantId),
    assignedStores: {
      $elemMatch: { storeId: storeObjId, status: "active" },
    },
  }).lean();

  if (campaigns.length === 0) return [];

  // Real billing-range counts per campaign (the card shows "N ranges").
  const ranges = await Range.find({
    campaignId: { $in: campaigns.map((c) => c._id) },
  })
    .select("campaignId")
    .lean();
  const rangeCount = ranges.reduce((acc, r) => {
    const k = String(r.campaignId);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return campaigns.map((campaign) => {
    // Use CAMPAIGN-level allocation so the figures match the campaign detail
    // page (the per-store assign quantity is a separate, internal number).
    const allocated = campaign.allocated_scratch_cards || 0;
    const used = campaign.used_scratch_cards || 0;
    const remaining =
      campaign.remaining_scratch_cards != null
        ? campaign.remaining_scratch_cards
        : Math.max(allocated - used, 0);
    const count = rangeCount[String(campaign._id)] || 0;

    return {
      _id: campaign._id,
      // campaignId is what AssignedCampaignsList uses for the remove action.
      campaignId: campaign._id,
      name: campaign.campaignName,
      campaignName: campaign.campaignName,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      // Campaign-level scratch counts (match the campaign detail page).
      scratchTotal: allocated,
      allocated_scratch_cards: allocated,
      scratchUsed: used,
      used_scratch_cards: used,
      scratchRemaining: remaining,
      remaining_scratch_cards: remaining,
      // The card reads billingRanges.length for the "N ranges" figure.
      billingRanges: new Array(count).fill(null),
    };
  });
}

/**
 * Per-store engagement metrics derived from CustomerParticipation (which carries
 * store_id). scans = total participation events at the store; customers = distinct
 * mobiles; conversions = participations that reached the "redeemed" status.
 */
async function computeStoreMetrics(storeId) {
  const storeObjId = toObjId(storeId);
  const rows = await CustomerParticipation.aggregate([
    { $match: { store_id: storeObjId } },
    {
      $group: {
        _id: null,
        scans: { $sum: 1 },
        conversions: {
          $sum: { $cond: [{ $eq: ["$status", "redeemed"] }, 1, 0] },
        },
        mobiles: { $addToSet: "$customer_mobile" },
      },
    },
    { $project: { scans: 1, conversions: 1, customers: { $size: "$mobiles" } } },
  ]);
  return rows[0] || { scans: 0, conversions: 0, customers: 0 };
}

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id: storeId } = await params;

    // Get user info from headers
    const userRole = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    // Authorization
    if (!hasPermission(userRole, "store:read")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", data: null },
        { status: 403 },
      );
    }

    // Get store
    const store = await StoreService.getStoreById(storeId);

    // Check authorization (can only view own stores unless Super_Admin)
    if (userRole !== "Super_Admin") {
      if (store.merchant_id.toString() !== userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized", data: null },
          { status: 403 },
        );
      }
    }

    // SOURCE-OF-TRUTH FIX: derive assigned campaigns from the campaign side
    // (campaign.assignedStores[]) instead of the stale store.assignedCampaigns
    // denormalized cache. Override the field and recompute the active count.
    const assignedCampaigns = await deriveAssignedCampaigns(
      store.merchant_id,
      store._id,
    );

    // Per-store engagement metrics (scans / conversions / customers).
    const metrics = await computeStoreMetrics(store._id);

    const storeWithCampaigns = {
      ...store,
      assignedCampaigns,
      active_campaigns: assignedCampaigns.filter(
        (c) => c.status === "active",
      ).length,
      total_scans: metrics.scans,
      conversions: metrics.conversions,
      total_customers: metrics.customers,
    };

    return NextResponse.json(
      {
        success: true,
        data: storeWithCampaigns,
        message: "Store retrieved successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching store:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error", data: null },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id: storeId } = await params;

    // Get user info from headers
    const userRole = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    // Authorization: Only store owner and Super_Admin can update
    if (!hasPermission(userRole, "store:update")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", data: null },
        { status: 403 },
      );
    }

    // Get request body
    const body = await request.json();

    // Verify store ownership
    const store = await StoreService.getStoreById(storeId);
    if (userRole !== "Super_Admin" && store.merchant_id.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", data: null },
        { status: 403 },
      );
    }

    // Update store
    const updatedStore = await StoreService.updateStore(storeId, body, userId);

    return NextResponse.json(
      {
        success: true,
        data: updatedStore,
        message: "Store updated successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating store:", error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 400 },
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error", data: null },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id: storeId } = await params;

    // Get user info from headers
    const userRole = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    // Authorization: Only store owner and Super_Admin can delete
    if (!hasPermission(userRole, "store:delete")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", data: null },
        { status: 403 },
      );
    }

    // Verify store ownership
    const store = await StoreService.getStoreById(storeId);
    if (userRole !== "Super_Admin" && store.merchant_id.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", data: null },
        { status: 403 },
      );
    }

    // Delete store
    await StoreService.deleteStore(storeId);

    return NextResponse.json(
      {
        success: true,
        data: null,
        message: "Store deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting store:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error", data: null },
      { status: 500 },
    );
  }
}
