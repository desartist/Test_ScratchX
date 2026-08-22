import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import SupportTicket from "@/models/supportTicketModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/support-tickets/[id] — full ticket detail with replies
export async function GET(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id } = await params;
  const ticket = await SupportTicket.findById(id)
    .populate("requesterId", "name email profile.storeName profile.companyName phone")
    .populate("assignedTo", "name email")
    .populate("replies.authorId", "name");

  if (!ticket) {
    return Response.json({ success: false, error: "Ticket not found" }, { status: 404 });
  }

  return Response.json({ success: true, ticket }, { status: 200 });
}

// PATCH /api/admin/support-tickets/[id] — assign / change status / reply /
// escalate (escalate = bump priority to Critical). One action per call.
export async function PATCH(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    return Response.json({ success: false, error: "Ticket not found" }, { status: 404 });
  }

  if (body.action === "assign") {
    ticket.assignedTo = body.assignedTo || null;
  } else if (body.action === "status") {
    const VALID = ["Open", "In Progress", "Waiting", "Resolved", "Closed"];
    if (!VALID.includes(body.status)) {
      return Response.json({ success: false, error: "Invalid status" }, { status: 400 });
    }
    ticket.status = body.status;
    if (body.status === "Resolved") ticket.resolvedAt = new Date();
    if (body.status === "Closed") ticket.closedAt = new Date();
    if (body.status === "Open" || body.status === "In Progress") {
      ticket.resolvedAt = null;
      ticket.closedAt = null;
    }
  } else if (body.action === "escalate") {
    ticket.priority = "Critical";
  } else if (body.action === "reply") {
    if (!body.message?.trim()) {
      return Response.json({ success: false, error: "message is required" }, { status: 400 });
    }
    ticket.replies.push({
      authorId: account._id,
      authorName: account.name || account.email,
      message: body.message,
      isInternalNote: !!body.isInternalNote,
    });
    if (ticket.status === "Open") ticket.status = "In Progress";
  } else {
    return Response.json(
      { success: false, error: "action must be one of: assign, status, escalate, reply" },
      { status: 400 },
    );
  }

  await ticket.save();
  await ticket.populate([
    { path: "requesterId", select: "name email profile.storeName profile.companyName" },
    { path: "assignedTo", select: "name email" },
    { path: "replies.authorId", select: "name" },
  ]);

  return Response.json({ success: true, ticket }, { status: 200 });
}
