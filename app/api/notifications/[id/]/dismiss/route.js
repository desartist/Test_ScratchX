import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connectDB";
import Notification from "@/models/notificationModel";

/**
 * POST /api/notifications/[id]/dismiss
 *
 * Dismiss/delete a notification
 */
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    const { id } = params;

    await Notification.findByIdAndDelete(id);

    return Response.json(
      {
        success: true,
        message: "Notification dismissed",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dismiss error:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to dismiss notification",
      },
      { status: 500 }
    );
  }
}
