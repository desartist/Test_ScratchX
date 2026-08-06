import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import dashboardService from "@/lib/dashboardService";
import Store from "@/models/storeModel";
import Campaign from "@/models/campaignModel";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-analytics
 * This store's slice of analytics. Scans/unique customers come from
 * dashboardService.getPerStoreStats (CustomerParticipation-backed — correct
 * regardless of allocation mechanism). "Used" cards and store name are
 * computed directly from Campaign.assignedStores[]/Store instead of
 * dashboardService.getStoreWisePerformance, which reads the CampaignStoreMapping
 * collection the real campaign wizard never populates (see
 * app/api/store-campaigns/route.js for the full explanation).
 * Store_Manager (analytics:own_store) gets the full slice; Store_Staff
 * (analytics:read) gets a smaller subset, enforced here so the response
 * shape itself is permission-appropriate rather than trusting the client to
 * hide fields.
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

    if (!account.storeId || !account.parentId) {
      return Response.json(
        { success: false, error: "No store is assigned to this account. Contact your business owner." },
        { status: 404 }
      );
    }

    const merchantId = account.parentId;
    const storeId = String(account.storeId);

    const [perStoreStats, store, campaignDocs] = await Promise.all([
      dashboardService.getPerStoreStats(merchantId),
      Store.findById(storeId).select("store_name").lean(),
      Campaign.find({
        "assignedStores.storeId": storeId,
        "assignedStores.status": "active",
      })
        .select("assignedStores.$")
        .lean(),
    ]);

    const stats = perStoreStats[storeId] || { customers: 0, scans: 0 };
    const used = campaignDocs.reduce((sum, c) => {
      const assignment = c.assignedStores[0];
      return sum + (assignment?.used_scratch_cards || 0) + (assignment?.redeemed_scratch_cards || 0);
    }, 0);

    if (account.role === "Store_Staff") {
      return Response.json(
        {
          success: true,
          analytics: {
            scans: stats.scans,
            used,
          },
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        success: true,
        analytics: {
          scans: stats.scans,
          uniqueCustomers: stats.customers,
          used,
          storeName: store?.store_name || null,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching store analytics:", err);
    return Response.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
