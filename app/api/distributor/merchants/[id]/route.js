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

  let summary = null;
  if (account.role === "Super_Admin") {
    const [distributor, storeCount, campaignCount, customerRows] = await Promise.all([
      merchant.parentId
        ? Account.findById(merchant.parentId).select("name profile.companyName")
        : null,
      Store.countDocuments({ merchant_id: merchant._id, isDeleted: { $ne: true } }),
      Campaign.countDocuments({ merchantId: merchant._id }),
      CustomerParticipation.aggregate([
        { $match: { merchant_id: merchant._id } },
        { $group: { _id: null, mobiles: { $addToSet: "$customer_mobile" } } },
      ]),
    ]);
    summary = {
      distributorName: distributor ? distributor.profile?.companyName || distributor.name : null,
      storeCount,
      campaignCount,
      customerCount: customerRows[0]?.mobiles.length || 0,
      scratchBalance: merchant.scratchCards || null,
    };
  }

  return Response.json(
    {
      success: true,
      merchant: { ...merchant.toObject(), subscription: subscription ?? null },
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
