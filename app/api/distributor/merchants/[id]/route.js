import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import Store from "@/models/storeModel";
import Campaign from "@/models/campaignModel";
import CustomerParticipation from "@/models/customerParticipationModel";
import { logAdminAction } from "@/lib/services/platformAuditService";

function distributorOrAdmin(account) {
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/distributor/merchants/[id] — a single merchant's full detail
// (Distributor may only view their own merchants; Super_Admin may view any,
// and additionally gets a platform-wide business summary: distributor name,
// store/campaign/customer counts, scratch balance)
export async function GET(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = distributorOrAdmin(account);
  if (denied) return denied;

  const { id } = await params;

  const query = { _id: id, role: "Merchant" };
  if (account.role === "Distributor") query.parentId = account._id;

  const merchant = await Account.findOne(query).select("-password -__v");
  if (!merchant) {
    return Response.json({ success: false, error: "Retailer not found" }, { status: 404 });
  }

  const subscription = await Subscription.findOne({ merchantId: merchant._id })
    .select("merchantId status currentPeriodEnd planType billingCycle unlimitedScratches.validUntil");

  // Stores, campaigns, and team (Store_Manager/Store_Staff) this retailer has
  // set up — shown to both the owning Distributor and Super_Admin so either
  // can see the full picture from this one detail page.
  const [stores, campaigns] = await Promise.all([
    Store.find({ merchant_id: merchant._id, isDeleted: { $ne: true } })
      .select("store_name store_code address city state pincode status createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    Campaign.find({ merchantId: merchant._id })
      .select("campaignName status startDate endDate allocated_scratch_cards used_scratch_cards redeemed_scratch_cards remaining_scratch_cards assignedStores createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const storeIds = stores.map((s) => s._id);
  const teamMembers = storeIds.length
    ? await Account.find({ storeId: { $in: storeIds }, role: { $in: ["Store_Manager", "Store_Staff"] } })
        .select("name email phone role status storeId createdAt lastLoginAt")
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const storeNameById = new Map(stores.map((s) => [String(s._id), s.store_name]));
  const managerNameByStoreId = new Map(
    teamMembers.filter((t) => t.role === "Store_Manager" && t.storeId).map((t) => [String(t.storeId), t.name]),
  );
  const campaignCountByStoreId = new Map();
  campaigns.forEach((c) => {
    (c.assignedStores || []).forEach((a) => {
      const key = String(a.storeId);
      campaignCountByStoreId.set(key, (campaignCountByStoreId.get(key) || 0) + 1);
    });
  });

  const storesWithDetails = stores.map((s) => ({
    ...s,
    managerName: managerNameByStoreId.get(String(s._id)) || null,
    campaignCount: campaignCountByStoreId.get(String(s._id)) || 0,
  }));
  const campaignsWithDetails = campaigns.map((c) => ({
    ...c,
    assignedStoreCount: (c.assignedStores || []).length,
  }));
  const teamWithDetails = teamMembers.map((t) => ({
    ...t,
    storeName: t.storeId ? storeNameById.get(String(t.storeId)) || null : null,
  }));

  let summary = null;
  if (account.role === "Super_Admin") {
    const [distributor, customerRows] = await Promise.all([
      merchant.parentId
        ? Account.findById(merchant.parentId).select("name profile.companyName")
        : null,
      CustomerParticipation.aggregate([
        { $match: { merchant_id: merchant._id } },
        { $group: { _id: null, mobiles: { $addToSet: "$customer_mobile" } } },
      ]),
    ]);
    summary = {
      distributorName: distributor ? distributor.profile?.companyName || distributor.name : null,
      storeCount: stores.length,
      campaignCount: campaigns.length,
      customerCount: customerRows[0]?.mobiles.length || 0,
      scratchBalance: merchant.scratchCards || null,
    };
  }

  return Response.json(
    {
      success: true,
      merchant: { ...merchant.toObject(), subscription: subscription ?? null },
      stores: storesWithDetails,
      campaigns: campaignsWithDetails,
      team: teamWithDetails,
      summary,
    },
    { status: 200 },
  );
}

// PATCH /api/distributor/merchants/[id] — Super_Admin only: activate/suspend
// a single retailer from their 360 detail page (Distributor already has this
// via the list PATCH endpoint; this mirrors it scoped to one id).
// Deliberately NOT delegated to internal Admin accounts — lib/adminPermissions.js
// keeps Retailers.delete empty for every adminRole, matching the platform
// rule that suspending a retailer is a Super_Admin-only action.
export async function PATCH(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json();
  if (!["active", "inactive", "suspended"].includes(status)) {
    return Response.json({ success: false, error: "Valid status is required" }, { status: 400 });
  }

  const previous = await Account.findOne({ _id: id, role: "Merchant" }).select("status name profile.storeName");
  if (!previous) {
    return Response.json({ success: false, error: "Retailer not found" }, { status: 404 });
  }

  const merchant = await Account.findOneAndUpdate(
    { _id: id, role: "Merchant" },
    { status },
    { new: true, select: "-password -__v" },
  );

  await logAdminAction({
    account,
    module: "Retailers",
    action: `Changed retailer status: ${previous.status} → ${status}`,
    request,
    targetType: "Account",
    targetId: merchant._id,
    targetLabel: merchant.profile?.storeName || merchant.name,
    before: { status: previous.status },
    after: { status },
  });

  return Response.json({ success: true, merchant }, { status: 200 });
}
