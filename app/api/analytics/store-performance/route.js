import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import dashboardService from "@/lib/dashboardService";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  try {
    const merchantId =
      account.role === "Manager" && account.parentId
        ? account.parentId
        : account._id;
    const [storeWise, perStore] = await Promise.all([
      dashboardService.getStoreWisePerformance(merchantId),
      dashboardService.getPerStoreStats(merchantId),
    ]);
    return NextResponse.json({ success: true, data: { storeWise, perStore } });
  } catch (e) {
    console.error("[analytics/store-performance]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load store performance" },
      { status: 500 },
    );
  }
}
