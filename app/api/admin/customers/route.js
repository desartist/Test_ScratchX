import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import CustomerParticipation from "@/models/customerParticipationModel";
import Campaign from "@/models/campaignModel";
import Store from "@/models/storeModel";
import { maskName, maskMobile } from "@/lib/maskPII";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/customers — platform-wide customer participation, with
// identity masked server-side (never sent to the client in full — see
// lib/maskPII.js). Filterable by store/campaign/status, not by name/phone
// since those are never exposed for search either.
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
  if (status && status !== "all") query.status = status;

  const now = new Date();
  const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [rows, total, distinctMobilesAgg, newCustomersAgg, repeatCount, redeemedCount, totalCount] =
    await Promise.all([
      CustomerParticipation.find(query)
        .select("customer_name customer_mobile campaign_id store_id status createdAt is_repeat_customer")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CustomerParticipation.countDocuments(query),
      CustomerParticipation.aggregate([{ $group: { _id: "$customer_mobile" } }]),
      CustomerParticipation.aggregate([
        { $match: { createdAt: { $gte: startOf30d } } },
        { $group: { _id: "$customer_mobile" } },
      ]),
      CustomerParticipation.countDocuments({ is_repeat_customer: true }),
      CustomerParticipation.countDocuments({ status: "redeemed" }),
      CustomerParticipation.countDocuments({}),
    ]);

  const campaignIds = [...new Set(rows.map((r) => String(r.campaign_id)))];
  const storeIds = [...new Set(rows.map((r) => String(r.store_id)))];
  const [campaigns, stores] = await Promise.all([
    campaignIds.length ? Campaign.find({ _id: { $in: campaignIds } }).select("campaignName") : [],
    storeIds.length ? Store.find({ _id: { $in: storeIds } }).select("store_name city") : [],
  ]);
  const campaignMap = Object.fromEntries(campaigns.map((c) => [String(c._id), c.campaignName]));
  const storeMap = Object.fromEntries(stores.map((s) => [String(s._id), s.store_name]));

  const customers = rows.map((r) => ({
    _id: r._id,
    maskedName: maskName(r.customer_name),
    maskedMobile: maskMobile(r.customer_mobile),
    campaignName: campaignMap[String(r.campaign_id)] || "—",
    storeName: storeMap[String(r.store_id)] || "—",
    status: r.status,
    isRepeatCustomer: !!r.is_repeat_customer,
    date: r.createdAt,
  }));

  return Response.json(
    {
      success: true,
      customers,
      total,
      page,
      limit,
      metrics: {
        totalCustomers: distinctMobilesAgg.length,
        newCustomers30d: newCustomersAgg.length,
        returningCustomers: repeatCount,
        redemptionRate: totalCount > 0 ? Math.round((redeemedCount / totalCount) * 1000) / 10 : 0,
        totalParticipations: totalCount,
      },
    },
    { status: 200 },
  );
}
