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
    const data = await dashboardService.getCampaignConsumption(merchantId);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[analytics/campaign-consumption]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load campaign consumption" },
      { status: 500 },
    );
  }
}
