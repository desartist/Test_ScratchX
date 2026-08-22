import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import PlatformAuditLog from "@/models/platformAuditLogModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/audit-logs — read-only. No PATCH/DELETE route exists for
// this collection anywhere — it is immutable from the admin UI by design.
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "30"));
  const moduleFilter = searchParams.get("module");
  const adminId = searchParams.get("adminId");
  const skip = (page - 1) * limit;

  const query = {};
  if (moduleFilter && moduleFilter !== "all") query.module = moduleFilter;
  if (adminId) query.adminId = adminId;

  const [logs, total, moduleAgg] = await Promise.all([
    PlatformAuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PlatformAuditLog.countDocuments(query),
    PlatformAuditLog.aggregate([
      { $group: { _id: "$module", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return Response.json(
    {
      success: true,
      logs,
      total,
      page,
      limit,
      metrics: {
        total,
        byModule: moduleAgg.map((m) => ({ module: m._id, count: m.count })),
      },
    },
    { status: 200 },
  );
}
