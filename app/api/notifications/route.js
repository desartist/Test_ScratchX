/**
 * GET /api/notifications
 * Get all notifications for authenticated user
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import notificationService from "@/lib/services/notificationService";

export async function GET(request) {
  await connectDB();
  const { account, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const ownerType = account.role?.toLowerCase().includes("distributor") ? "distributor" : "merchant";
    const limit = parseInt(request.nextUrl.searchParams.get("limit")) || 20;

    const notifications = await notificationService.getNotifications(
      account._id,
      ownerType,
      limit
    );

    return NextResponse.json(
      {
        success: true,
        data: notifications,
        count: notifications.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Get Notifications] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}
