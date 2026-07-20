import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
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
  const skip = (page - 1) * limit;

  const query = { role: "Merchant" };
  // Distributor only sees their own merchants; Super_Admin can see all
  if (account.role === "Distributor") query.parentId = account._id;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { "profile.storeName": { $regex: search, $options: "i" } },
      { "profile.storeLocation": { $regex: search, $options: "i" } },
    ];
  }
  if (status) {
    query.status = status;
  }

  const baseScope = { role: "Merchant" };
  if (account.role === "Distributor") baseScope.parentId = account._id;

  const [merchants, total, activeCount, pendingCount, totalCount] = await Promise.all([
    Account.find(query)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Account.countDocuments(query),
    Account.countDocuments({ ...baseScope, status: "active" }),
    Account.countDocuments({ ...baseScope, status: "pending" }),
    Account.countDocuments(baseScope),
  ]);

  // Attach subscription info
  const ids = merchants.map((m) => m._id);
  const subs = await Subscription.find({ merchantId: { $in: ids } })
    .select("merchantId status currentPeriodEnd planType billingCycle unlimitedScratches.validUntil");

  const subMap = {};
  for (const s of subs) subMap[s.merchantId.toString()] = s;

  const enriched = merchants.map((m) => ({
    ...m.toObject(),
    subscription: subMap[m._id.toString()] ?? null,
  }));

  return Response.json(
    {
      success: true,
      merchants: enriched,
      total,
      page,
      limit,
      metrics: { total: totalCount, active: activeCount, pending: pendingCount },
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
    storeName, storeAddress, businessType, countryCode, phoneNumber, storeLocation,
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
      profile: { storeName, storeAddress, businessType, countryCode, phoneNumber, storeLocation },
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
