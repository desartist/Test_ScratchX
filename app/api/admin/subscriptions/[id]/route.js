import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Subscription from "@/models/subscriptionModel";
import { logAdminAction } from "@/lib/services/platformAuditService";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// PATCH /api/admin/subscriptions/[id] — Cancel a subscription, or extend its
// scratch-entitlement validity by N days. To change PLAN, use
// POST /api/admin/subscription/assign instead (it handles the cancel-old +
// create-new + inventory bookkeeping already).
export async function PATCH(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id } = await params;
  const { action, extendDays } = await request.json();

  const subscription = await Subscription.findById(id);
  if (!subscription) {
    return Response.json({ success: false, error: "Subscription not found" }, { status: 404 });
  }

  const previousStatus = subscription.status;
  const previousValidUntil = subscription.unlimitedScratches?.validUntil || null;

  if (action === "cancel") {
    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    await subscription.save();
  } else if (action === "extend") {
    const days = Number(extendDays);
    if (!Number.isFinite(days) || days <= 0) {
      return Response.json({ success: false, error: "extendDays must be a positive number" }, { status: 400 });
    }
    const base =
      subscription.unlimitedScratches?.validUntil && subscription.unlimitedScratches.validUntil > new Date()
        ? subscription.unlimitedScratches.validUntil
        : new Date();
    subscription.unlimitedScratches = subscription.unlimitedScratches || {};
    subscription.unlimitedScratches.validUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    subscription.unlimitedScratches.isActive = true;
    if (subscription.status === "expired" || subscription.status === "cancelled") {
      subscription.status = "active";
    }
    await subscription.save();
  } else {
    return Response.json({ success: false, error: "action must be 'cancel' or 'extend'" }, { status: 400 });
  }

  await logAdminAction({
    account,
    module: "Subscriptions",
    action: action === "cancel" ? "Cancelled subscription" : `Extended subscription by ${extendDays} day(s)`,
    request,
    targetType: "Subscription",
    targetId: subscription._id,
    targetLabel: `${subscription.planType} (${subscription.ownerType})`,
    before: { status: previousStatus, validUntil: previousValidUntil },
    after: { status: subscription.status, validUntil: subscription.unlimitedScratches?.validUntil || null },
  });

  return Response.json({ success: true, subscription }, { status: 200 });
}
