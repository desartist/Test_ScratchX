import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import dashboardService from "@/lib/dashboardService";

const STORE_TEAM_ROLES = ["Store_Manager", "Store_Staff"];

/**
 * GET /api/store-analytics
 * This store's slice of the merchant-wide analytics dashboard service
 * already computes (lib/dashboardService.js getStoreWisePerformance /
 * getPerStoreStats are both keyed by storeId) — no new aggregation logic,
 * just picking out this account's own store. Store_Manager
 * (analytics:own_store) gets the full slice; Store_Staff (analytics:read)
 * gets a smaller subset, enforced here so the response shape itself is
 * permission-appropriate rather than trusting the client to hide fields.
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

    const [storePerformance, perStoreStats] = await Promise.all([
      dashboardService.getStoreWisePerformance(merchantId),
      dashboardService.getPerStoreStats(merchantId),
    ]);

    const performance = storePerformance.find((s) => String(s.storeId) === storeId);
    const stats = perStoreStats[storeId] || { customers: 0, scans: 0 };

    if (account.role === "Store_Staff") {
      return Response.json(
        {
          success: true,
          analytics: {
            scans: stats.scans,
            used: performance?.used ?? 0,
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
          used: performance?.used ?? 0,
          storeName: performance?.name || null,
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
