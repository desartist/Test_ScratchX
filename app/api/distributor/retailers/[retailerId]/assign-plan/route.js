import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import { inventoryService } from "@/lib/services/distributor";
import scratchEntitlementService from "@/lib/scratchEntitlementService";

// POST /api/distributor/retailers/[retailerId]/assign-plan
//
// Grants a CORE/SMART plan to an EXISTING retailer from the distributor's
// purchased inventory. Deliberately mirrors the plan-grant branch of
// POST /api/distributor/merchants (the proven, canonical activation flow —
// Subscription -> scratchEntitlementService.activateUnlimitedScratches ->
// inventoryService.assignFromInventory -> Account.activePlan) rather than
// reusing lib/services/distributor/assignmentService.js: that older service
// (a) never calls activateUnlimitedScratches, so a subscription it creates
// wouldn't actually have working entitlements, and (b) records a commission
// into distributorCommissionModel, a ledger the live Dashboard and
// Commission Summary page never read (they use models/commissionModel.js).
// Per product decision, assigning a plan is free from paid inventory and
// records no commission at assignment time — consistent with today's
// retailer-creation-with-plan flow.
export async function POST(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (account.role !== "Distributor") {
    return Response.json({ success: false, error: "Only distributors can assign plans" }, { status: 403 });
  }

  const { retailerId } = await params;
  const { planType } = await request.json();
  if (!planType || !["CORE", "SMART"].includes(planType)) {
    return Response.json({ success: false, error: "planType must be CORE or SMART" }, { status: 400 });
  }

  const retailer = await Account.findOne({ _id: retailerId, role: "Merchant", parentId: account._id });
  if (!retailer) {
    return Response.json({ success: false, error: "Retailer not found under this distributor" }, { status: 404 });
  }

  const existingSubscription = await Subscription.findOne({
    ownerId: retailer._id,
    ownerType: "merchant",
    status: { $in: ["trial", "active"] },
  });
  if (existingSubscription) {
    return Response.json(
      { success: false, error: "This retailer already has an active subscription" },
      { status: 400 },
    );
  }

  const available = await inventoryService.hasAvailableInventory(account._id, planType, 1);
  if (!available) {
    return Response.json(
      {
        success: false,
        error: `You don't have any ${planType === "SMART" ? "Smart" : "Core"} licenses left. Buy more from the marketplace first.`,
      },
      { status: 400 },
    );
  }

  const now = new Date();
  let subscription = await Subscription.create({
    ownerId: retailer._id,
    ownerType: "merchant",
    merchantId: retailer._id,
    planType,
    distributorId: account._id,
    status: "active",
    billingCycle: "one-time",
    purchaseDate: now,
  });

  await scratchEntitlementService.activateUnlimitedScratches(subscription._id);
  await inventoryService.assignFromInventory(account._id, planType, retailer._id);

  await Account.findByIdAndUpdate(retailer._id, {
    activePlan: planType,
    subscriptionId: subscription._id,
    planPurchaseDate: now,
  });

  subscription = await Subscription.findById(subscription._id);

  return Response.json({ success: true, subscription }, { status: 201 });
}
