import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";

function distributorOrAdmin(account) {
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/distributor/merchants/[id] — a single merchant's full detail
// (Distributor may only view their own merchants; Super_Admin may view any)
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

  return Response.json(
    {
      success: true,
      merchant: { ...merchant.toObject(), subscription: subscription ?? null },
    },
    { status: 200 },
  );
}
