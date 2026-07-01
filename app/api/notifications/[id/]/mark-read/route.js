import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import Notification from "@/models/notificationModel";

/**
 * POST /api/notifications/[id]/mark-read
 *
 * Mark a notification as read
 */
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const { id } = params;
    const ownerType = account.role === "Distributor" ? "distributor" : "merchant";

    await Notification.findByIdAndUpdate(
      id,
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
      { new: true }
    );

    return Response.json(
      {
        success: true,
        message: "Marked as read",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Mark read error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to mark as read",
      },
      { status: 500 }
    );
  }
}
