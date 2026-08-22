import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import Store from "@/models/storeModel";
import Campaign from "@/models/campaignModel";
import CustomerParticipation from "@/models/customerParticipationModel";
import bcrypt from "bcrypt";
import { inventoryService } from "@/lib/services/distributor";
import scratchEntitlementService from "@/lib/scratchEntitlementService";

function distributorOrAdmin(account) {
  if (!["Super_Admin", "Distributor"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/distributor/merchants — list my merchants (Distributor sees own; Admin sees all)
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = distributorOrAdmin(account);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const businessModel = searchParams.get("businessModel");
  const skip = (page - 1) * limit;

  // Accounts created before businessModel existed have no value set —
  // treat those as Retail (the pre-existing, default kind of merchant)
  // rather than excluding them from the Retailers count/filter.
  const RETAIL_MATCH = {
    $or: [
      { "profile.businessModel": "Retail" },
      { "profile.businessModel": null },
      { "profile.businessModel": { $exists: false } },
    ],
  };
  const WHOLESALE_MATCH = { "profile.businessModel": "Wholesale" };

  const query = { role: "Merchant" };
  // Distributor only sees their own merchants; Super_Admin can see all
  if (account.role === "Distributor") query.parentId = account._id;
  if (status) {
    query.status = status;
  }

  // search and businessModel each need their own $or — combine them under
  // $and instead of assigning both to query.$or, which would silently drop one.
  const andClauses = [];
  if (search) {
    andClauses.push({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { "profile.storeName": { $regex: search, $options: "i" } },
        { "profile.storeLocation": { $regex: search, $options: "i" } },
        { "profile.businessModel": { $regex: search, $options: "i" } },
      ],
    });
  }
  if (businessModel === "Retail") {
    andClauses.push(RETAIL_MATCH);
  } else if (businessModel === "Wholesale") {
    andClauses.push(WHOLESALE_MATCH);
  }
  if (andClauses.length) {
    query.$and = andClauses;
  }

  const baseScope = { role: "Merchant" };
  if (account.role === "Distributor") baseScope.parentId = account._id;

  const [merchants, total, activeCount, pendingCount, totalCount, wholesaleCount] = await Promise.all([
    Account.find(query)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Account.countDocuments(query),
    Account.countDocuments({ ...baseScope, status: "active" }),
    Account.countDocuments({ ...baseScope, status: "pending" }),
    Account.countDocuments(baseScope),
    Account.countDocuments({ ...baseScope, ...WHOLESALE_MATCH }),
  ]);
  const retailCount = totalCount - wholesaleCount;

  // Attach subscription info
  const ids = merchants.map((m) => m._id);
  const subs = await Subscription.find({ merchantId: { $in: ids } })
    .select("merchantId status currentPeriodEnd planType billingCycle unlimitedScratches.validUntil");

  const subMap = {};
  for (const s of subs) subMap[s.merchantId.toString()] = s;

  // Platform-wide extras (distributor name, store/campaign/customer counts) —
  // only computed for Super_Admin's view, since Distributor's own "my
  // retailers" page never needed and never showed these before.
  let distributorNameMap = {};
  let storeCountMap = {};
  let campaignCountMap = {};
  let customerCountMap = {};
  if (account.role === "Super_Admin" && ids.length > 0) {
    const distributorIds = [
      ...new Set(merchants.map((m) => m.parentId).filter(Boolean).map(String)),
    ];
    const [distributors, storeCounts, campaignCounts, customerCounts] = await Promise.all([
      distributorIds.length
        ? Account.find({ _id: { $in: distributorIds } }).select("name profile.companyName")
        : [],
      Store.aggregate([
        { $match: { merchant_id: { $in: ids }, isDeleted: { $ne: true } } },
        { $group: { _id: "$merchant_id", count: { $sum: 1 } } },
      ]),
      Campaign.aggregate([
        { $match: { merchantId: { $in: ids } } },
        { $group: { _id: "$merchantId", count: { $sum: 1 } } },
      ]),
      CustomerParticipation.aggregate([
        { $match: { merchant_id: { $in: ids } } },
        { $group: { _id: "$merchant_id", mobiles: { $addToSet: "$customer_mobile" } } },
      ]),
    ]);
    distributorNameMap = Object.fromEntries(
      distributors.map((d) => [String(d._id), d.profile?.companyName || d.name]),
    );
    storeCountMap = Object.fromEntries(storeCounts.map((s) => [String(s._id), s.count]));
    campaignCountMap = Object.fromEntries(campaignCounts.map((c) => [String(c._id), c.count]));
    customerCountMap = Object.fromEntries(
      customerCounts.map((c) => [String(c._id), c.mobiles.length]),
    );
  }

  const enriched = merchants.map((m) => {
    const base = {
      ...m.toObject(),
      subscription: subMap[m._id.toString()] ?? null,
    };
    if (account.role !== "Super_Admin") return base;
    const idStr = String(m._id);
    return {
      ...base,
      distributorName: m.parentId ? distributorNameMap[String(m.parentId)] || null : null,
      storeCount: storeCountMap[idStr] || 0,
      campaignCount: campaignCountMap[idStr] || 0,
      customerCount: customerCountMap[idStr] || 0,
    };
  });

  return Response.json(
    {
      success: true,
      merchants: enriched,
      total,
      page,
      limit,
      metrics: {
        total: totalCount,
        active: activeCount,
        pending: pendingCount,
        retail: retailCount,
        wholesale: wholesaleCount,
      },
    },
    { status: 200 },
  );
}

// PATCH /api/distributor/merchants — update a merchant's status (suspend/activate)
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = distributorOrAdmin(account);
  if (denied) return denied;

  const { id, status } = await request.json();

  if (!id || !["active", "inactive", "suspended"].includes(status)) {
    return Response.json(
      { success: false, error: "id and valid status are required" },
      { status: 400 },
    );
  }

  const query = { _id: id, role: "Merchant" };
  // Distributor may only update their own merchants; Super_Admin may update any
  if (account.role === "Distributor") query.parentId = account._id;

  const merchant = await Account.findOneAndUpdate(
    query,
    { status },
    { new: true, select: "-password -__v" },
  );

  if (!merchant) {
    return Response.json({ success: false, error: "Merchant not found" }, { status: 404 });
  }

  return Response.json({ success: true, merchant }, { status: 200 });
}

// POST /api/distributor/merchants — create a merchant and optionally assign a plan
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = distributorOrAdmin(account);
  if (denied) return denied;

  const {
    name, email, password,
    storeName, storeAddress, businessType, businessModel, countryCode, phoneNumber, storeLocation,
    planType,
  } = await request.json();

  if (!name || !email || !password) {
    return Response.json(
      { success: false, error: "name, email and password are required" },
      { status: 400 },
    );
  }

  if (planType && !["CORE", "SMART"].includes(planType)) {
    return Response.json(
      { success: false, error: "Invalid planType" },
      { status: 400 },
    );
  }

  // A distributor granting a plan on creation must have inventory for it —
  // check before creating the account so we don't leave an orphaned merchant
  // behind if the assignment fails.
  if (planType && account.role === "Distributor") {
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
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const merchant = await Account.create({
      name,
      email,
      password: hashed,
      role: "Merchant",
      createdBy: account._id,
      parentId: account.role === "Distributor" ? account._id : null,
      profile: { storeName, storeAddress, businessType, businessModel, countryCode, phoneNumber, storeLocation },
    });

    // Optionally activate a real subscription immediately (deducting from the
    // distributor's purchased inventory, same 365-day grant as a self-service purchase)
    let subscription = null;
    if (planType) {
      const now = new Date();

      subscription = await Subscription.create({
        ownerId: merchant._id,
        ownerType: "merchant",
        merchantId: merchant._id,
        planType,
        distributorId: account.role === "Distributor" ? account._id : null,
        status: "active",
        billingCycle: "one-time",
        purchaseDate: now,
      });

      await scratchEntitlementService.activateUnlimitedScratches(subscription._id);

      if (account.role === "Distributor") {
        await inventoryService.assignFromInventory(account._id, planType, merchant._id);
      }

      await Account.findByIdAndUpdate(merchant._id, {
        activePlan: planType,
        subscriptionId: subscription._id,
        planPurchaseDate: now,
      });

      // Re-fetch so the response reflects the post-activation state
      // (activateUnlimitedScratches updates the DB directly, not this in-memory doc)
      subscription = await Subscription.findById(subscription._id);
    }

    return Response.json(
      {
        success: true,
        merchant: {
          _id: merchant._id,
          name: merchant.name,
          email: merchant.email,
          role: merchant.role,
          profile: merchant.profile,
        },
        subscription,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ success: false, error: "Email already exists" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
