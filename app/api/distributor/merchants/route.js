import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import SubscriptionPlan from "@/models/subscriptionPlanModel";
import bcrypt from "bcrypt";

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
  const skip = (page - 1) * limit;

  const query = { role: "Merchant" };
  // Distributor only sees their own merchants; Super_Admin can see all
  if (account.role === "Distributor") query.parentId = account._id;

  const [merchants, total] = await Promise.all([
    Account.find(query)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Account.countDocuments(query),
  ]);

  // Attach subscription info
  const ids = merchants.map((m) => m._id);
  const subs = await Subscription.find({ merchantId: { $in: ids } })
    .populate("planId", "name price")
    .select("merchantId status currentPeriodEnd planId billingCycle");

  const subMap = {};
  for (const s of subs) subMap[s.merchantId.toString()] = s;

  const enriched = merchants.map((m) => ({
    ...m.toObject(),
    subscription: subMap[m._id.toString()] ?? null,
  }));

  return Response.json({ success: true, merchants: enriched, total, page, limit }, { status: 200 });
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
    planId, billingCycle = "monthly",
  } = await request.json();

  if (!name || !email || !password) {
    return Response.json(
      { success: false, error: "name, email and password are required" },
      { status: 400 },
    );
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

    // Optionally assign subscription plan immediately
    let subscription = null;
    if (planId) {
      const plan = await SubscriptionPlan.findById(planId);
      if (plan) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "annual" ? 12 : 1));

        subscription = await Subscription.create({
          merchantId: merchant._id,
          planId: plan._id,
          distributorId: account.role === "Distributor" ? account._id : null,
          status: "active",
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          usage: { lastResetAt: now },
        });
      }
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
