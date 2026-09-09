import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Lead from "@/models/leadModel";
import passwordService from "@/lib/passwordService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function distributorOrAdmin(account) {
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/distributor/sales-executives — list this distributor's sales team
// with lead-performance metrics (assigned/contacted/demos/converted/pending)
export async function GET() {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = distributorOrAdmin(account);
  if (denied) return denied;

  const query = { role: "Sales_Executive" };
  if (account.role === "Distributor") query.parentId = account._id;

  const executives = await Account.find(query)
    .select("name email phone status profile.territory createdAt lastLoginAt parentId")
    .sort({ createdAt: -1 })
    .lean();

  const execIds = executives.map((e) => e._id);
  const leadStats = execIds.length
    ? await Lead.aggregate([
        { $match: { assignedTo: { $in: execIds } } },
        {
          $group: {
            _id: "$assignedTo",
            leadsAssigned: { $sum: 1 },
            leadsContacted: {
              $sum: { $cond: [{ $eq: ["$status", "New Lead"] }, 0, 1] },
            },
            demosScheduled: {
              $sum: { $cond: [{ $in: ["$status", ["Demo Scheduled", "Demo Done"]] }, 1, 0] },
            },
            demosCompleted: {
              $sum: { $cond: [{ $eq: ["$status", "Demo Done"] }, 1, 0] },
            },
            converted: {
              $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] },
            },
            pendingFollowUps: {
              $sum: { $cond: [{ $eq: ["$status", "Follow-up Pending"] }, 1, 0] },
            },
          },
        },
      ])
    : [];

  const statsByExec = Object.fromEntries(leadStats.map((s) => [String(s._id), s]));

  const enriched = executives.map((e) => {
    const stats = statsByExec[String(e._id)] || {
      leadsAssigned: 0,
      leadsContacted: 0,
      demosScheduled: 0,
      demosCompleted: 0,
      converted: 0,
      pendingFollowUps: 0,
    };
    return {
      _id: e._id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      status: e.status,
      territory: e.profile?.territory || null,
      createdAt: e.createdAt,
      lastLoginAt: e.lastLoginAt,
      leadsAssigned: stats.leadsAssigned,
      leadsContacted: stats.leadsContacted,
      demosScheduled: stats.demosScheduled,
      demosCompleted: stats.demosCompleted,
      plansSold: stats.converted,
      conversionRate: stats.leadsAssigned > 0 ? Math.round((stats.converted / stats.leadsAssigned) * 100) : 0,
      pendingFollowUps: stats.pendingFollowUps,
    };
  });

  return Response.json({ success: true, executives: enriched, count: enriched.length }, { status: 200 });
}

// POST /api/distributor/sales-executives — add a sales executive to my team
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (account.role !== "Distributor") {
    return Response.json(
      { success: false, error: "Only distributors can add sales executives" },
      { status: 403 },
    );
  }

  const { name, email, phone, password, territory } = await request.json();

  if (!name || !email || !phone || !password) {
    return Response.json(
      { success: false, error: "Name, email, phone, and password are required" },
      { status: 400 },
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ success: false, error: "Please enter a valid email address" }, { status: 400 });
  }
  if (!/^\d{10}$/.test(phone)) {
    return Response.json({ success: false, error: "Phone number must be exactly 10 digits" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await Account.findOne({ email: email.toLowerCase() });
  if (existing) {
    return Response.json({ success: false, error: "Email already exists" }, { status: 400 });
  }

  const hashedPassword = await passwordService.hashPassword(password);

  const executive = await Account.create({
    name,
    email: email.toLowerCase(),
    phone,
    password: hashedPassword,
    role: "Sales_Executive",
    parentId: account._id,
    createdBy: account._id,
    status: "active",
    profile: { territory: territory || null },
  });

  return Response.json(
    {
      success: true,
      message: "Sales executive added successfully",
      executive: {
        _id: executive._id,
        name: executive.name,
        email: executive.email,
        phone: executive.phone,
        status: executive.status,
        territory: executive.profile?.territory || null,
      },
    },
    { status: 201 },
  );
}
