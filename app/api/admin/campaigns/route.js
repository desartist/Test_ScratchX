import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Campaign from "@/models/campaignModel";
import Account from "@/models/accountModel";
import CustomerParticipation from "@/models/customerParticipationModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/campaigns — platform-wide campaign directory (all merchants),
// with QR scan / participation / redemption performance per campaign.
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

  const query = {};
  if (search) {
    query.campaignName = { $regex: search, $options: "i" };
  }
  if (status) query.status = status;

  const [campaigns, total, activeCount, pausedCount, endedCount, totalCount] = await Promise.all([
    Campaign.find(query)
      .select(
        "campaignName merchantId status startDate endDate assignedStores allocated_scratch_cards used_scratch_cards redeemed_scratch_cards remaining_scratch_cards tracking createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Campaign.countDocuments(query),
    Campaign.countDocuments({ status: "active" }),
    Campaign.countDocuments({ status: "paused" }),
    Campaign.countDocuments({ status: "ended" }),
    Campaign.countDocuments({}),
  ]);

  const campaignIds = campaigns.map((c) => c._id);
  const merchantIds = [...new Set(campaigns.map((c) => String(c.merchantId)))];

  const [merchants, redemptionCounts] = await Promise.all([
    merchantIds.length
      ? Account.find({ _id: { $in: merchantIds } }).select("name profile.storeName")
      : [],
    campaignIds.length
      ? CustomerParticipation.aggregate([
          { $match: { campaign_id: { $in: campaignIds }, status: "redeemed" } },
          { $group: { _id: "$campaign_id", count: { $sum: 1 } } },
        ])
      : [],
  ]);

  const merchantMap = Object.fromEntries(
    merchants.map((m) => [String(m._id), m.profile?.storeName || m.name]),
  );
  const redemptionMap = Object.fromEntries(redemptionCounts.map((r) => [String(r._id), r.count]));

  const enriched = campaigns.map((c) => {
    const activeStores = (c.assignedStores || []).filter((s) => s.status === "active");
    return {
      _id: c._id,
      name: c.campaignName,
      merchantName: merchantMap[String(c.merchantId)] || "—",
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      storeCount: activeStores.length,
      qrScans: c.tracking?.qrCodesScanned || 0,
      participations: c.tracking?.uniqueCustomers || 0,
      allocated: c.allocated_scratch_cards || 0,
      used: c.used_scratch_cards || 0,
      redeemed: c.redeemed_scratch_cards || 0,
      remaining: c.remaining_scratch_cards || 0,
      redemptionCount: redemptionMap[String(c._id)] || 0,
      conversionRate: c.tracking?.conversionRate || 0,
    };
  });

  return Response.json(
    {
      success: true,
      campaigns: enriched,
      total,
      page,
      limit,
      metrics: {
        total: totalCount,
        active: activeCount,
        paused: pausedCount,
        ended: endedCount,
      },
    },
    { status: 200 },
  );
}
