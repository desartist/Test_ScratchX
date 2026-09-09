import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import SupportTicket from "@/models/supportTicketModel";

// GET/POST /api/support-tickets — self-service tickets for the currently
// authenticated Merchant/Distributor (as opposed to
// /api/admin/support-tickets, which is Super_Admin logging a ticket on
// someone else's behalf). Same model, same shape, different requester
// source — kept as a separate route rather than overloading the admin one
// with two different auth/ownership rules.
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (!["Merchant", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const query = { requesterId: account._id };
  const [tickets, total] = await Promise.all([
    SupportTicket.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SupportTicket.countDocuments(query),
  ]);

  return Response.json({ success: true, tickets, total, page, limit }, { status: 200 });
}

export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (!["Merchant", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { subject, description, category, priority } = await request.json();
  if (!subject || !description) {
    return Response.json({ success: false, error: "subject and description are required" }, { status: 400 });
  }

  const ticket = await SupportTicket.create({
    requesterId: account._id,
    requesterRole: account.role,
    subject,
    description,
    category: category || "Other",
    priority: priority || "Medium",
    status: "Open",
  });

  return Response.json({ success: true, ticket }, { status: 201 });
}
