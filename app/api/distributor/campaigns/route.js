import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Campaign from "@/models/campaignModel";
import CustomerParticipation from "@/models/customerParticipationModel";

// GET /api/distributor/campaigns — read-only campaign summary across every
// retailer in this distributor's network. Powers "Campaign Support": a
// Distributor can see how campaigns are performing and which retailers need
// help, but campaign settings themselves stay Merchant/Manager-owned (no
// write actions here — see app/(dashboard)/campaign/[id] for that).
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";

  const retailerScope = account.role === "Distributor" ? { parentId: account._id } : {};
  const retailers = await Account.find({ role: "Merchant", ...retailerScope }).select("_id name profile.storeName");
  const retailerIds = retailers.map((r) => r._id);
  const retailerNameById = Object.fromEntries(
    retailers.map((r) => [String(r._id), r.profile?.storeName || r.name]),
  );

  if (retailerIds.length === 0) {
    return Response.json(
      { success: true, campaigns: [], metrics: { total: 0, active: 0, endingSoon: 0, noScans: 0 } },
      { status: 200 },
    );
  }

  const query = { merchantId: { $in: retailerIds } };
  if (status && status !== "all") query.status = status;
  if (search) query.campaignName = { $regex: search, $options: "i" };

  const campaigns = await Campaign.find(query)
    .select("campaignName merchantId status startDate endDate allocated_scratch_cards used_scratch_cards redeemed_scratch_cards createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const campaignIds = campaigns.map((c) => c._id);
  const scanRows = campaignIds.length
    ? await CustomerParticipation.aggregate([
        { $match: { campaign_id: { $in: campaignIds } } },
        { $group: { _id: "$campaign_id", count: { $sum: 1 } } },
      ])
    : [];
  const scanCountByCampaign = new Map(scanRows.map((r) => [String(r._id), r.count]));

  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const enriched = campaigns.map((c) => {
    const scans = scanCountByCampaign.get(String(c._id)) || 0;
    return {
      _id: c._id,
      campaignName: c.campaignName,
      retailerId: c.merchantId,
      retailerName: retailerNameById[String(c.merchantId)] || "Unknown",
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      scratchesAllocated: c.allocated_scratch_cards || 0,
      scratchesUsed: c.used_scratch_cards || 0,
      scratchesRedeemed: c.redeemed_scratch_cards || 0,
      scans,
      endingSoon: c.status === "active" && new Date(c.endDate) <= soon,
      needsAttention: c.status === "active" && scans === 0,
    };
  });

  return Response.json(
    {
      success: true,
      campaigns: enriched,
      metrics: {
        total: enriched.length,
        active: enriched.filter((c) => c.status === "active").length,
        endingSoon: enriched.filter((c) => c.endingSoon).length,
        noScans: enriched.filter((c) => c.needsAttention).length,
      },
    },
    { status: 200 },
  );
}
