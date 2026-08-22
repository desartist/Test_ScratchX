import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
// subscriptionModel's `ownerId` field has no static `ref` (it can point at
// either a merchant or distributor Account, decided by `ownerType`), so
// populate needs the model named explicitly here.
import "@/models/accountModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/subscriptions — every subscription on the platform
// (merchant + distributor owned), with owner/distributor names populated.
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
  const skip = (page - 1) * limit;

  const query = {};
  if (status === "expiring") {
    query.status = "active";
    query["unlimitedScratches.validUntil"] = {
      $gte: new Date(),
      $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  } else if (status) {
    query.status = status;
  }

  const now = new Date();

  const [subscriptions, total, platformTotal, statusCounts, expiringCount] = await Promise.all([
    Subscription.find(query)
      .populate({ path: "ownerId", model: "Account", select: "name email profile.storeName profile.companyName role" })
      .populate("distributorId", "name profile.companyName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(query),
    Subscription.countDocuments({}),
    Subscription.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Subscription.countDocuments({
      status: "active",
      "unlimitedScratches.validUntil": { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const metrics = { active: 0, trial: 0, past_due: 0, cancelled: 0, expired: 0 };
  for (const row of statusCounts) {
    if (row._id in metrics) metrics[row._id] = row.count;
  }

  return Response.json(
    {
      success: true,
      subscriptions,
      total,
      page,
      limit,
      metrics: { ...metrics, expiring: expiringCount, total: platformTotal },
    },
    { status: 200 },
  );
}
