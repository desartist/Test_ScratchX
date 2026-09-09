import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Lead from "@/models/leadModel";

// POST /api/distributor/leads/[id]/notes — add a follow-up note
export async function POST(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (!["Super_Admin", "Distributor", "Sales_Executive"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { message } = await request.json();
  if (!message || !message.trim()) {
    return Response.json({ success: false, error: "Note message is required" }, { status: 400 });
  }

  const query = { _id: id };
  if (account.role === "Distributor") query.distributorId = account._id;
  if (account.role === "Sales_Executive") query.assignedTo = account._id;

  const lead = await Lead.findOne(query);
  if (!lead) {
    return Response.json({ success: false, error: "Lead not found" }, { status: 404 });
  }

  lead.notes.push({ authorId: account._id, authorName: account.name, message: message.trim() });
  lead.timeline.push({
    event: "note_added",
    detail: message.trim().slice(0, 140),
    actorId: account._id,
    actorName: account.name,
  });
  await lead.save();

  return Response.json({ success: true, lead }, { status: 200 });
}
