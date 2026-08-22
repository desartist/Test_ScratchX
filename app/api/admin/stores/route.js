import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Store from "@/models/storeModel";
import Account from "@/models/accountModel";
import Campaign from "@/models/campaignModel";
import CustomerParticipation from "@/models/customerParticipationModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/stores — platform-wide store directory (all merchants),
// with campaign/customer counts and the assigned store manager.
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

  const query = { isDeleted: { $ne: true } };
  if (search) {
    query.$or = [
      { store_name: { $regex: search, $options: "i" } },
      { store_code: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { state: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;

  const [stores, total, activeCount, inactiveCount, suspendedCount, totalCount] = await Promise.all([
    Store.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Store.countDocuments(query),
    Store.countDocuments({ isDeleted: { $ne: true }, status: "active" }),
    Store.countDocuments({ isDeleted: { $ne: true }, status: "inactive" }),
    Store.countDocuments({ isDeleted: { $ne: true }, status: "suspended" }),
    Store.countDocuments({ isDeleted: { $ne: true } }),
  ]);

  const storeIds = stores.map((s) => s._id);
  const merchantIds = [...new Set(stores.map((s) => String(s.merchant_id)))];

  const [merchants, managers, campaignCounts, customerCounts] = await Promise.all([
    merchantIds.length
      ? Account.find({ _id: { $in: merchantIds } }).select("name profile.storeName")
      : [],
    storeIds.length
      ? Account.find({ storeId: { $in: storeIds }, role: "Store_Manager" }).select("name storeId")
      : [],
    storeIds.length
      ? Campaign.aggregate([
          { $match: { "assignedStores.storeId": { $in: storeIds }, "assignedStores.status": "active" } },
          { $unwind: "$assignedStores" },
          { $match: { "assignedStores.storeId": { $in: storeIds }, "assignedStores.status": "active" } },
          { $group: { _id: "$assignedStores.storeId", count: { $sum: 1 } } },
        ])
      : [],
    storeIds.length
      ? CustomerParticipation.aggregate([
          { $match: { store_id: { $in: storeIds } } },
          { $group: { _id: "$store_id", mobiles: { $addToSet: "$customer_mobile" } } },
        ])
      : [],
  ]);

  const merchantMap = Object.fromEntries(
    merchants.map((m) => [String(m._id), m.profile?.storeName || m.name]),
  );
  const managerMap = Object.fromEntries(managers.map((m) => [String(m.storeId), m.name]));
  const campaignCountMap = Object.fromEntries(campaignCounts.map((c) => [String(c._id), c.count]));
  const customerCountMap = Object.fromEntries(
    customerCounts.map((c) => [String(c._id), c.mobiles.length]),
  );

  const enriched = stores.map((s) => ({
    ...s,
    merchantName: merchantMap[String(s.merchant_id)] || "—",
    storeManagerName: managerMap[String(s._id)] || null,
    campaignCount: campaignCountMap[String(s._id)] || 0,
    customerCount: customerCountMap[String(s._id)] || 0,
  }));

  return Response.json(
    {
      success: true,
      stores: enriched,
      total,
      page,
      limit,
      metrics: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        suspended: suspendedCount,
      },
    },
    { status: 200 },
  );
}
