import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import dashboardService from "@/lib/dashboardService";

/**
 * GET /api/dashboard
 *
 * Get dashboard data based on user role
 * - SuperAdmin: system-wide metrics
 * - Distributor: merchant oversight, commission data
 * - Merchant: campaigns, stores, customer data
 *
 * Response varies by role but always includes:
 * {
 *   success: true,
 *   role: "Merchant" | "Distributor" | "SuperAdmin",
 *   data: { ... role-specific data }
 * }
 */
export async function GET(request) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    let data;

    switch (account.role) {
      case "SuperAdmin":
        data = await dashboardService.getSuperAdminDashboard();
        break;

      case "Distributor":
        data = await dashboardService.getAdminDashboard(account._id);
        break;

      case "Merchant":
        data = await dashboardService.getRetailerDashboard(account._id);
        console.log('[DASHBOARD API] Merchant data:', {
          totalStores: data?.metrics?.totalStores,
          storesArray: data?.stores?.length,
          subscriptionStatus: data?.subscription?.status,
        });
        break;

      default:
        return Response.json(
          {
            success: false,
            error: "Unknown role",
          },
          { status: 400 }
        );
    }

    return Response.json(
      { success: true, role: account.role, data },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
      }
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to fetch dashboard data",
      },
      { status: 500 }
    );
  }
}
