import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import TeamSeatRequest from "@/models/teamSeatRequestModel";
import Store from "@/models/storeModel";
import Notification from "@/models/notificationModel";

const ROLE_LABELS = { Store_Manager: "Store Manager", Store_Staff: "Store Staff" };
const SEAT_FIELD = { Store_Manager: "teamSeatAddons.extraManagerSeats", Store_Staff: "teamSeatAddons.extraStaffSeats" };

/**
 * PATCH /api/distributor/seat-requests/[id]
 * Distributor marks a request Paid (activates the seat) or Rejected.
 * Body: { status: 'paid' | 'rejected', notes? }
 */
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { account, error } = await requireAuth();
    if (error) return error;

    if (account.role !== "Distributor") {
      return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
    }

    const { id } = await params;
    const { status, notes } = await request.json();

    if (!["paid", "rejected"].includes(status)) {
      return Response.json({ success: false, error: "status must be paid or rejected" }, { status: 400 });
    }

    const seatRequest = await TeamSeatRequest.findOne({ _id: id, distributorId: account._id });
    if (!seatRequest) {
      return Response.json({ success: false, error: "Request not found" }, { status: 404 });
    }
    if (seatRequest.status !== "pending") {
      return Response.json(
        { success: false, error: `Request already ${seatRequest.status}` },
        { status: 400 }
      );
    }

    seatRequest.status = status;
    seatRequest.resolvedAt = new Date();
    seatRequest.resolvedBy = account._id;
    if (notes) seatRequest.notes = notes;
    await seatRequest.save();

    if (status === "paid") {
      await Store.findByIdAndUpdate(seatRequest.storeId, {
        $inc: { [SEAT_FIELD[seatRequest.role]]: seatRequest.quantity },
      });
    }

    const roleLabel = ROLE_LABELS[seatRequest.role];
    await Notification.create({
      ownerId: seatRequest.merchantId,
      ownerType: "merchant",
      type: "team_seat_resolved",
      title: status === "paid" ? "Extra seat activated" : "Seat request rejected",
      message:
        status === "paid"
          ? `Your extra ${roleLabel} seat (${seatRequest.quantity}) is now active.`
          : `Your request for ${seatRequest.quantity} extra ${roleLabel} seat(s) was rejected by your distributor.`,
      actionUrl: "/team",
      severity: status === "paid" ? "info" : "medium",
    }).catch((err) => console.error("[distributor/seat-requests/:id] notification error:", err));

    return Response.json({ success: true, request: seatRequest }, { status: 200 });
  } catch (err) {
    console.error("Error resolving seat request:", err);
    return Response.json({ success: false, error: err.message || "Failed to update request" }, { status: 500 });
  }
}
