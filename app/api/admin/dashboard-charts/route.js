import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import dashboardService from "@/lib/dashboardService";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/dashboard-charts — platform-wide (all merchants) versions
// of the same three chart data sets the Merchant SmartDashboard already
// shows (Scratch Consumption, Campaign-wise Consumption, Store-wise
// Performance), reusing the identical real aggregations minus the
// merchant_id scoping.
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") ?? "30")));

  const [scratchUsage, campaignConsumption, storeWise] = await Promise.all([
    dashboardService.getPlatformDailyScratchUsage({ days }),
    dashboardService.getPlatformCampaignConsumption({ limit: 5 }),
    dashboardService.getPlatformStoreWisePerformance({ limit: 5 }),
  ]);

  return Response.json(
    { success: true, scratchUsage, campaignConsumption, storeWise },
    { status: 200 },
  );
}
