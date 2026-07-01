import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Subscription from "@/models/subscriptionModel";
import "@/models/subscriptionPlanModel";
import bcrypt from "bcrypt";

async function merchantOnly(account) {
  if (!["Super_Admin", "Merchant"].includes(account.role)) {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/merchant/managers — list managers for the authenticated merchant
export async function GET() {
  await connectDB();
  const { account, error } = await requireAuth("manager:read");
  if (error) return error;

  const ownerId = account.role === "Merchant" ? account._id : null;
  const query = { role: "Manager" };
  if (ownerId) query.parentId = ownerId;

  const managers = await Account.find(query).select("-password -__v").sort({ createdAt: -1 });

  return Response.json({ success: true, managers }, { status: 200 });
}

// POST /api/merchant/managers — create a manager (plan limit enforced)
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth("manager:create");
  if (error) return error;

  if (account.role !== "Merchant") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Enforce plan limit for managers
  const subscription = await Subscription.findOne({
    merchantId: account._id,
    status: { $in: ["trial", "active"] },
  }).populate("planId");

  if (subscription?.planId) {
    const limit = subscription.planId.features.maxManagers;
    if (limit !== -1) {
      const currentCount = await Account.countDocuments({
        role: "Manager",
        parentId: account._id,
        status: { $ne: "inactive" },
      });
      if (currentCount >= limit) {
        return Response.json(
          {
            success: false,
            error: `Manager limit reached (${limit}). Upgrade your plan to add more.`,
            upgrade: true,
          },
          { status: 403 },
        );
      }
    }
  }

  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return Response.json(
      { success: false, error: "name, email and password are required" },
      { status: 400 },
    );
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const manager = await Account.create({
      name,
      email,
      password: hashed,
      role: "Manager",
      createdBy: account._id,
      parentId: account._id,
      profile: {
        storeName: account.profile?.storeName,
      },
    });

    return Response.json(
      {
        success: true,
        manager: {
          _id: manager._id,
          name: manager.name,
          email: manager.email,
          role: manager.role,
        },
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

// PATCH /api/merchant/managers — update manager status
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth("manager:update");
  if (error) return error;

  if (account.role !== "Merchant") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id, status } = await request.json();

  if (!id || !["active", "inactive", "suspended"].includes(status)) {
    return Response.json(
      { success: false, error: "id and valid status are required" },
      { status: 400 },
    );
  }

  const manager = await Account.findOneAndUpdate(
    { _id: id, role: "Manager", parentId: account._id },
    { status },
    { new: true, select: "-password -__v" },
  );

  if (!manager) {
    return Response.json({ success: false, error: "Manager not found" }, { status: 404 });
  }

  return Response.json({ success: true, manager }, { status: 200 });
}

// DELETE /api/merchant/managers — soft-delete (set inactive)
export async function DELETE(request) {
  await connectDB();
  const { account, error } = await requireAuth("manager:delete");
  if (error) return error;

  if (account.role !== "Merchant") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return Response.json({ success: false, error: "id is required" }, { status: 400 });
  }

  const manager = await Account.findOneAndUpdate(
    { _id: id, role: "Manager", parentId: account._id },
    { status: "inactive" },
    { new: true, select: "-password -__v" },
  );

  if (!manager) {
    return Response.json({ success: false, error: "Manager not found" }, { status: 404 });
  }

  return Response.json({ success: true, manager }, { status: 200 });
}
