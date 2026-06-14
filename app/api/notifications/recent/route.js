/**
 * GET /api/notifications/recent
 * Get the latest notifications for the authenticated owner (newest first).
 */

import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Notification from "@/models/notificationModel";
import { NextResponse } from "next/server";

export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  try {
    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";
    const ownerId =
      account.role === "Manager" && account.parentId
        ? account.parentId
        : account._id;
    const limit = Math.min(
      50,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 10)
    );
    const rows = await Notification.find({ ownerId, ownerType })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const data = rows.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      createdAt: n.createdAt,
      actionUrl: n.actionUrl || null,
    }));
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[notifications/recent]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
