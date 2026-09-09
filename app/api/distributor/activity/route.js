import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import Campaign from "@/models/campaignModel";

const ACTIVITY_LIMIT = 50;

// GET /api/distributor/activity — a chronological feed of retailer-network
// events (new retailer, plan purchased/granted, campaign created), merged
// from the models that already record each event's own timestamp. No new
// "activity log" model — the underlying events already have createdAt on
// Account/Subscription/Campaign, so this just merges and sorts them rather
// than introducing a second, redundant audit trail to keep in sync.
export async function GET() {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (account.role !== "Distributor") {
    return Response.json({ success: false, error: "Only distributors can view retailer activity" }, { status: 403 });
  }

  const retailers = await Account.find({ role: "Merchant", parentId: account._id })
    .select("_id name profile.storeName createdAt")
    .sort({ createdAt: -1 })
    .limit(ACTIVITY_LIMIT)
    .lean();
  const retailerIds = retailers.map((r) => r._id);
  const nameById = Object.fromEntries(retailers.map((r) => [String(r._id), r.profile?.storeName || r.name]));

  const [subs, campaigns] = await Promise.all([
    retailerIds.length
      ? Subscription.find({ ownerId: { $in: retailerIds }, ownerType: "merchant" })
          .select("ownerId planType createdAt")
          .sort({ createdAt: -1 })
          .limit(ACTIVITY_LIMIT)
          .lean()
      : [],
    retailerIds.length
      ? Campaign.find({ merchantId: { $in: retailerIds } })
          .select("merchantId campaignName createdAt")
          .sort({ createdAt: -1 })
          .limit(ACTIVITY_LIMIT)
          .lean()
      : [],
  ]);

  const events = [
    ...retailers.map((r) => ({
      type: "retailer_added",
      label: `${nameById[String(r._id)]} joined as a new retailer`,
      at: r.createdAt,
    })),
    ...subs.map((s) => ({
      type: "plan_granted",
      label: `${nameById[String(s.ownerId)] || "A retailer"} was granted a ${s.planType} plan`,
      at: s.createdAt,
    })),
    ...campaigns.map((c) => ({
      type: "campaign_created",
      label: `${nameById[String(c.merchantId)] || "A retailer"} created campaign "${c.campaignName}"`,
      at: c.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, ACTIVITY_LIMIT);

  return Response.json({ success: true, events }, { status: 200 });
}
