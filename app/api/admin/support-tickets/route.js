import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import SupportTicket from "@/models/supportTicketModel";
import Account from "@/models/accountModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/support-tickets — every ticket on the platform
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const skip = (page - 1) * limit;

  const query = {};
  if (status && status !== "all") query.status = status;
  if (priority && priority !== "all") query.priority = priority;

  const [tickets, total, statusAgg] = await Promise.all([
    SupportTicket.find(query)
      .populate("requesterId", "name email profile.storeName profile.companyName")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupportTicket.countDocuments(query),
    SupportTicket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const metrics = { Open: 0, "In Progress": 0, Waiting: 0, Resolved: 0, Closed: 0 };
  for (const row of statusAgg) {
    if (row._id in metrics) metrics[row._id] = row.count;
  }

  return Response.json(
    { success: true, tickets, total, page, limit, metrics },
    { status: 200 },
  );
}

// POST /api/admin/support-tickets — log a new ticket on behalf of a
// retailer/distributor (e.g. one that came in via phone/email/chat).
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { requesterId, subject, description, category, priority } = await request.json();

  if (!requesterId || !subject || !description) {
    return Response.json(
      { success: false, error: "requesterId, subject and description are required" },
      { status: 400 },
    );
  }

  const requester = await Account.findById(requesterId).select("role");
  if (!requester || !["Merchant", "Distributor"].includes(requester.role)) {
    return Response.json({ success: false, error: "Requester must be a retailer or distributor" }, { status: 400 });
  }

  const ticket = await SupportTicket.create({
    requesterId,
    requesterRole: requester.role,
    subject,
    description,
    category: category || "Other",
    priority: priority || "Medium",
    status: "Open",
  });

  return Response.json({ success: true, ticket }, { status: 201 });
}
