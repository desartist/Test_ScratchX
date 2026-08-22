import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import CustomerParticipation from "@/models/customerParticipationModel";
import Campaign from "@/models/campaignModel";
import Store from "@/models/storeModel";
import ScratchCardRecord from "@/models/scratchCardRecordModel";
import { maskName, maskMobile } from "@/lib/maskPII";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/redemptions — platform-wide QR scan -> scratch -> reward ->
// redemption journey, sourced from CustomerParticipation (the durable,
// non-TTL record of that flow), identity masked server-side.
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

  const [rows, total, redeemedCount, revealedCount, totalCount, campaignAgg] = await Promise.all([
    CustomerParticipation.find(query)
      .select("customer_name customer_mobile campaign_id store_id scratch_card_id status createdAt redeemed_at")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CustomerParticipation.countDocuments(query),
    CustomerParticipation.countDocuments({ status: "redeemed" }),
    CustomerParticipation.countDocuments({ status: { $in: ["revealed", "redeemed"] } }),
    CustomerParticipation.countDocuments({}),
    Campaign.aggregate([
      { $group: { _id: null, totalScans: { $sum: "$tracking.qrCodesScanned" }, count: { $sum: 1 } } },
    ]),
  ]);

  const campaignIds = [...new Set(rows.map((r) => String(r.campaign_id)))];
  const storeIds = [...new Set(rows.map((r) => String(r.store_id)))];
  const scratchCardIds = rows.map((r) => r.scratch_card_id).filter(Boolean);

  const [campaigns, stores, scratchCards] = await Promise.all([
    campaignIds.length ? Campaign.find({ _id: { $in: campaignIds } }).select("campaignName") : [],
    storeIds.length ? Store.find({ _id: { $in: storeIds } }).select("store_name") : [],
    scratchCardIds.length
      ? ScratchCardRecord.find({ _id: { $in: scratchCardIds } }).select("reward_type reward_value reward_description")
      : [],
  ]);
  const campaignMap = Object.fromEntries(campaigns.map((c) => [String(c._id), c.campaignName]));
  const storeMap = Object.fromEntries(stores.map((s) => [String(s._id), s.store_name]));
  const rewardMap = Object.fromEntries(scratchCards.map((s) => [String(s._id), s]));

  function rewardLabel(card) {
    if (!card) return null;
    if (card.reward_type === "freeItem") return card.reward_description || "Free Gift";
    if (card.reward_type === "cashback") return `${card.reward_value}% cashback`;
    return card.reward_value ? `₹${card.reward_value} off` : null;
  }

  const redemptions = rows.map((r) => ({
    _id: r._id,
    maskedName: maskName(r.customer_name),
    maskedMobile: maskMobile(r.customer_mobile),
    campaignName: campaignMap[String(r.campaign_id)] || "—",
    storeName: storeMap[String(r.store_id)] || "—",
    status: r.status,
    reward: rewardLabel(rewardMap[String(r.scratch_card_id)]),
    scannedAt: r.createdAt,
    redeemedAt: r.redeemed_at,
  }));

  return Response.json(
    {
      success: true,
      redemptions,
      total,
      page,
      limit,
      metrics: {
        totalCampaignsWithQr: campaignAgg[0]?.count || 0,
        totalScans: campaignAgg[0]?.totalScans || 0,
        rewardsWon: revealedCount,
        totalRedemptions: redeemedCount,
        conversionRate: totalCount > 0 ? Math.round((redeemedCount / totalCount) * 1000) / 10 : 0,
      },
    },
    { status: 200 },
  );
}
