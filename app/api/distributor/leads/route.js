import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Lead, { LEAD_STATUSES } from "@/models/leadModel";
import { SALES_EXECUTIVE_ENABLED } from "@/lib/featureFlags";

const ALLOWED_ROLES = ["Super_Admin", "Distributor", "Sales_Executive"];

// Distributor sees only their own leads; Sales_Executive sees only leads
// assigned to them (never a colleague's, and never another distributor's
// network); Super_Admin can see across all distributors for oversight —
// same visibility rule already used for Retailers (merchants/route.js).
function scopeFor(account) {
  if (account.role === "Distributor") return { distributorId: account._id };
  if (account.role === "Sales_Executive") return { assignedTo: account._id };
  return {};
}

// GET /api/distributor/leads — list leads, scoped by role
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (!ALLOWED_ROLES.includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const interestLevel = searchParams.get("interestLevel");
  const hasFollowUp = searchParams.get("hasFollowUp");
  const sortBy = searchParams.get("sortBy"); // "followUp" -> soonest next-follow-up first
  const skip = (page - 1) * limit;

  const baseScope = scopeFor(account);
  const query = { ...baseScope };
  // status accepts a single value or a comma-separated list — the latter
  // powers the "Demo Follow-ups" queue (Demo Scheduled + Follow-up Pending
  // leads in one view) without a second, near-duplicate endpoint.
  if (status && status !== "all") {
    const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
    query.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  // Distributor/Admin may further filter by a specific exec; a Sales_Executive's
  // scope is already pinned to themselves above, so this filter is a no-op for them.
  if (account.role !== "Sales_Executive" && assignedTo && assignedTo !== "all") {
    query.assignedTo = assignedTo === "unassigned" ? null : assignedTo;
  }
  if (interestLevel && interestLevel !== "all") query.interestLevel = interestLevel;
  if (hasFollowUp === "true") query.nextFollowUpDate = { $ne: null };
  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: "i" } },
      { ownerName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
    ];
  }

  const sortSpec = sortBy === "followUp" ? { nextFollowUpDate: 1 } : { createdAt: -1 };

  const [leads, total, statusCounts] = await Promise.all([
    Lead.find(query)
      .select("-notes -timeline")
      .populate("assignedTo", "name email")
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(query),
    Lead.aggregate([
      { $match: baseScope },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const countsByStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  for (const row of statusCounts) {
    if (row._id) countsByStatus[row._id] = row.count;
  }
  const totalLeads = Object.values(countsByStatus).reduce((a, b) => a + b, 0);
  const converted = countsByStatus["Converted"] || 0;

  return Response.json(
    {
      success: true,
      leads,
      total,
      page,
      limit,
      metrics: {
        total: totalLeads,
        byStatus: countsByStatus,
        conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0,
        followUpsPending: countsByStatus["Follow-up Pending"] || 0,
        demosScheduled: countsByStatus["Demo Scheduled"] || 0,
      },
    },
    { status: 200 },
  );
}

// POST /api/distributor/leads — create a new lead
//
// Deliberately Sales_Executive-only for now (Super_Admin also allowed, for
// platform-level seeding/support) — Distributor is view/manage only
// (assign, status, notes, convert), not creation. This is a temporary
// product decision communicated by the team; Distributor-side lead
// creation is planned for later, so don't "fix" this by re-widening it.
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  // Creation was scoped to Sales_Executive while that feature was being built.
  // It's hidden for now (see lib/featureFlags.js), and leaving the rule in
  // place would mean nobody could create a lead at all — so Distributors do it
  // themselves until the feature ships. The UI check reads the same flag.
  const creatorRoles = SALES_EXECUTIVE_ENABLED
    ? ["Sales_Executive", "Super_Admin"]
    : ["Distributor", "Super_Admin"];
  if (!creatorRoles.includes(account.role)) {
    return Response.json(
      {
        success: false,
        error: SALES_EXECUTIVE_ENABLED
          ? "Only Sales Executives can create leads right now"
          : "Only Distributors can create leads right now",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const {
    businessName, ownerName, phone, email, businessCategory,
    city, state, territory, assignedTo, distributorId: bodyDistributorId,
  } = body;

  if (!businessName || !ownerName || !phone) {
    return Response.json(
      { success: false, error: "Business name, owner name, and phone are required" },
      { status: 400 },
    );
  }

  // Sales_Executive: leads belong to their own distributor (parentId) and
  // default to self-assigned. A Distributor creating a lead owns it directly.
  // Super_Admin must specify which distributor this lead belongs to.
  let distributorId;
  let effectiveAssignedTo = assignedTo || null;
  if (account.role === "Sales_Executive") {
    distributorId = account.parentId;
    effectiveAssignedTo = assignedTo || account._id;
  } else if (account.role === "Distributor") {
    distributorId = account._id;
  } else {
    distributorId = bodyDistributorId;
  }
  if (!distributorId) {
    return Response.json({ success: false, error: "distributorId is required" }, { status: 400 });
  }

  if (effectiveAssignedTo) {
    const exec = await Account.findOne({
      _id: effectiveAssignedTo,
      role: "Sales_Executive",
      parentId: distributorId,
      status: { $ne: "deactivated" },
    }).select("_id");
    if (!exec) {
      return Response.json(
        { success: false, error: "Assigned sales executive not found under this distributor" },
        { status: 400 },
      );
    }
  }

  const lead = await Lead.create({
    distributorId,
    businessName,
    ownerName,
    phone,
    email: email || null,
    businessCategory: businessCategory || null,
    city: city || null,
    state: state || null,
    territory: territory || null,
    assignedTo: effectiveAssignedTo,
    createdBy: account._id,
    timeline: [
      { event: "created", detail: "Lead created", actorId: account._id, actorName: account.name },
      ...(effectiveAssignedTo
        ? [{ event: "assigned", detail: "Assigned on creation", actorId: account._id, actorName: account.name }]
        : []),
    ],
  });

  return Response.json({ success: true, lead }, { status: 201 });
}
