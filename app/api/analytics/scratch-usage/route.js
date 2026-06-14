import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import dashboardService from "@/lib/dashboardService";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  try {
    const merchantId =
      account.role === "Manager" && account.parentId
        ? account.parentId
        : account._id;
    const days = Math.min(
      90,
      Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7),
    );
    const data = await dashboardService.getDailyScratchUsage(merchantId, {
      days,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[analytics/scratch-usage]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load scratch usage" },
      { status: 500 },
    );
  }
}
