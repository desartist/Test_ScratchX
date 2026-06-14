import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import SubscriptionPlan from "@/models/subscriptionPlanModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/plans — list all plans (including inactive/private)
export async function GET() {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const plans = await SubscriptionPlan.find({}).sort({ sortOrder: 1 });
  return Response.json({ success: true, plans }, { status: 200 });
}

// POST /api/admin/plans — create a new plan
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const body = await request.json();

  try {
    const plan = await SubscriptionPlan.create(body);
    return Response.json({ success: true, plan }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ success: false, error: "Plan name already exists" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/plans — update an existing plan
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id, ...updates } = await request.json();

  if (!id) {
    return Response.json({ success: false, error: "id is required" }, { status: 400 });
  }

  // Prevent changing the plan name (it's used as a unique key)
  delete updates.name;

  const plan = await SubscriptionPlan.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!plan) {
    return Response.json({ success: false, error: "Plan not found" }, { status: 404 });
  }

  return Response.json({ success: true, plan }, { status: 200 });
}

// DELETE /api/admin/plans — soft-delete by marking inactive
export async function DELETE(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id } = await request.json();
  if (!id) {
    return Response.json({ success: false, error: "id is required" }, { status: 400 });
  }

  const plan = await SubscriptionPlan.findByIdAndUpdate(
    id,
    { isActive: false, isPublic: false },
    { new: true },
  );

  if (!plan) {
    return Response.json({ success: false, error: "Plan not found" }, { status: 404 });
  }

  return Response.json({ success: true, plan }, { status: 200 });
}
