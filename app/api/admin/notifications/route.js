import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Notification from "@/models/notificationModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/notifications — every notification sent on the platform,
// with delivery status and severity breakdowns.
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const type = searchParams.get("type");
  const severity = searchParams.get("severity");
  const skip = (page - 1) * limit;

  const query = {};
  if (type && type !== "all") query.type = type;
  if (severity && severity !== "all") query.severity = severity;

  const [notifications, total, severityAgg, typeAgg] = await Promise.all([
    Notification.find(query)
      .populate("ownerId", "name email profile.storeName profile.companyName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.aggregate([{ $group: { _id: "$severity", count: { $sum: 1 } } }]),
    Notification.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const bySeverity = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  for (const row of severityAgg) {
    if (row._id in bySeverity) bySeverity[row._id] = row.count;
  }

  return Response.json(
    {
      success: true,
      notifications,
      total,
      page,
      limit,
      metrics: {
        total,
        bySeverity,
        topTypes: typeAgg.map((t) => ({ type: t._id, count: t.count })),
      },
    },
    { status: 200 },
  );
}
