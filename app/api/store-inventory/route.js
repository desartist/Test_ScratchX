import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Store from "@/models/storeModel";
import Campaign from "@/models/campaignModel";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-inventory
 * Read-only scratch-card inventory status for the authenticated
 * Store_Manager/Store_Staff's own store (allocated/used/redeemed/remaining,
 * per campaign). Both roles see the same data — inventory:allocate has no
 * store-level write semantics yet.
 *
 * Reads Campaign.assignedStores[] directly (see app/api/store-campaigns/route.js
 * for why — the real campaign wizard never populates CampaignStoreMapping,
 * which is what InventoryService.getStoreInventoryStatus reads).
 */
export async function GET() {
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

    const store = await Store.findById(account.storeId).lean();
    if (!store) {
      return Response.json({ success: false, error: "Store not found" }, { status: 404 });
    }

    const campaignDocs = await Campaign.find({
      "assignedStores.storeId": account.storeId,
      "assignedStores.status": "active",
    })
      .select("campaignName status assignedStores.$")
      .lean();

    const campaignAllocations = campaignDocs.map((c) => {
      const assignment = c.assignedStores[0];
      return {
        campaignId: c._id,
        campaignName: c.campaignName,
        allocated: assignment?.allocated_scratch_cards ?? 0,
        used: assignment?.used_scratch_cards ?? 0,
        redeemed: assignment?.redeemed_scratch_cards ?? 0,
        remaining: assignment?.remaining_scratch_cards ?? 0,
        status: c.status,
      };
    });

    const totalAllocated = campaignAllocations.reduce((sum, c) => sum + c.allocated, 0);
    const totalUsed = campaignAllocations.reduce((sum, c) => sum + c.used, 0);
    const totalRedeemed = campaignAllocations.reduce((sum, c) => sum + c.redeemed, 0);
    const storeTotal = store.total_scratch_cards || 0;

    return Response.json(
      {
        success: true,
        inventory: {
          total: storeTotal,
          allocated: totalAllocated,
          used: totalUsed,
          redeemed: totalRedeemed,
          unallocated: Math.max(0, storeTotal - totalAllocated),
          utilizationPercentage:
            storeTotal > 0 ? Math.round(((totalUsed + totalRedeemed) / storeTotal) * 100) : 0,
        },
        campaignAllocations,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching store inventory:", err);
    return Response.json(
      { success: false, error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
