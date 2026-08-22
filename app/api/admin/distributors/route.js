import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Commission from "@/models/commissionModel";
import bcrypt from "bcrypt";
import { logAdminAction } from "@/lib/services/platformAuditService";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/distributors — list all distributors
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const skip = (page - 1) * limit;

  const query = { role: "Distributor" };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { "profile.companyName": { $regex: search, $options: "i" } },
    ];
  }
  if (status) {
    query.status = status;
  }

  const [distributors, total, activeCount, suspendedCount, totalCount] = await Promise.all([
    Account.find(query)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Account.countDocuments(query),
    Account.countDocuments({ role: "Distributor", status: "active" }),
    Account.countDocuments({ role: "Distributor", status: "suspended" }),
    Account.countDocuments({ role: "Distributor" }),
  ]);

  // Commission earned per distributor on this page (Total Earned column).
  const distributorIds = distributors.map((d) => d._id);
  const commissionAgg = distributorIds.length
    ? await Commission.aggregate([
        { $match: { distributorId: { $in: distributorIds } } },
        { $group: { _id: "$distributorId", totalEarning: { $sum: "$totalEarning" } } },
      ])
    : [];
  const commissionMap = Object.fromEntries(
    commissionAgg.map((c) => [String(c._id), c.totalEarning]),
  );
  const enriched = distributors.map((d) => ({
    ...d.toObject(),
    totalCommissionEarned: commissionMap[String(d._id)] || 0,
  }));

  return Response.json(
    {
      success: true,
      distributors: enriched,
      total,
      page,
      limit,
      metrics: { total: totalCount, active: activeCount, suspended: suspendedCount },
    },
    { status: 200 },
  );
}

// POST /api/admin/distributors — create a distributor account
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { name, email, phone, password, companyName, territory, region, commissionRate } =
    await request.json();

  if (!name || !email || !password) {
    return Response.json(
      { success: false, error: "name, email and password are required" },
      { status: 400 },
    );
  }

  let parsedCommissionRate = null;
  if (commissionRate !== undefined && commissionRate !== null && commissionRate !== "") {
    parsedCommissionRate = Number(commissionRate);
    if (Number.isNaN(parsedCommissionRate) || parsedCommissionRate < 0 || parsedCommissionRate > 100) {
      return Response.json(
        { success: false, error: "commissionRate must be a number between 0 and 100" },
        { status: 400 },
      );
    }
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const distributor = await Account.create({
      name,
      email,
      phone,
      password: hashed,
      role: "Distributor",
      status: "active",
      // Super_Admin is both the creator and the immediate parent in the
      // role hierarchy (Super_Admin -> Distributor -> Merchant -> ...).
      createdBy: account._id,
      parentId: account._id,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      // commissionRate is the % of each merchant payment this distributor
      // earns (see app/api/payment/verify/route.js) — falls back to
      // DISTRIBUTOR_COMMISSION_RATE env if left unset.
      profile: { companyName, territory, region, commissionRate: parsedCommissionRate },
    });

    return Response.json(
      {
        success: true,
        distributor: {
          _id: distributor._id,
          name: distributor.name,
          email: distributor.email,
          phone: distributor.phone,
          role: distributor.role,
          status: distributor.status,
          profile: distributor.profile,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ success: false, error: "Email already exists" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/distributors — update status (suspend/activate)
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id, status } = await request.json();

  if (!id || !["active", "inactive", "suspended"].includes(status)) {
    return Response.json(
      { success: false, error: "id and valid status are required" },
      { status: 400 },
    );
  }

  const previous = await Account.findOne({ _id: id, role: "Distributor" }).select("status name profile.companyName");
  if (!previous) {
    return Response.json({ success: false, error: "Distributor not found" }, { status: 404 });
  }

  const distributor = await Account.findOneAndUpdate(
    { _id: id, role: "Distributor" },
    { status },
    { new: true, select: "-password -__v" },
  );

  await logAdminAction({
    account,
    module: "Distributors",
    action: `Changed distributor status: ${previous.status} → ${status}`,
    request,
    targetType: "Account",
    targetId: distributor._id,
    targetLabel: distributor.profile?.companyName || distributor.name,
    before: { status: previous.status },
    after: { status },
  });

  return Response.json({ success: true, distributor }, { status: 200 });
}
