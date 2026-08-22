import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Payment from "@/models/paymentModel";
import { logAdminAction } from "@/lib/services/platformAuditService";
import { hasAdminModulePermission } from "@/lib/adminPermissions";

// Super_Admin is always allowed; internal Admin accounts (Finance/Sales/...)
// are checked against the Payments module in lib/adminPermissions.js.
function requirePaymentsAccess(account, action) {
  if (account.role === "Super_Admin") return null;
  if (hasAdminModulePermission(account, "Payments", action)) return null;
  return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
}

// GET /api/admin/payments — all payments with pagination and filters
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = requirePaymentsAccess(account, "view");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const status = searchParams.get("status");     // filter by payment status
  const merchantId = searchParams.get("merchantId");
  const skip = (page - 1) * limit;

  const query = {};
  if (status) query.status = status;
  if (merchantId) query.merchantId = merchantId;

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate("merchantId", "name email profile.storeName")
      .populate("distributorId", "name email profile.companyName")
      .populate("subscriptionId", "status billingCycle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  return Response.json({ success: true, payments, total, page, limit }, { status: 200 });
}

// PATCH /api/admin/payments — Verify / Mark Paid / Reject / Refund a payment
export async function PATCH(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;

  const { id, action } = await request.json();
  const ACTION_STATUS = { verify: "success", markPaid: "success", reject: "failed", refund: "refunded" };
  const nextStatus = ACTION_STATUS[action];

  // Refund is the sensitive one — gated separately from the other, lower-risk
  // status transitions per lib/adminPermissions.js's Payments.refund list.
  const denied = requirePaymentsAccess(account, action === "refund" ? "refund" : "edit");
  if (denied) return denied;

  if (!id || !nextStatus) {
    return Response.json(
      { success: false, error: "id and a valid action (verify, markPaid, reject, refund) are required" },
      { status: 400 },
    );
  }

  const previous = await Payment.findById(id).select("status totalAmount");
  if (!previous) {
    return Response.json({ success: false, error: "Payment not found" }, { status: 404 });
  }

  const payment = await Payment.findByIdAndUpdate(id, { status: nextStatus }, { new: true })
    .populate("merchantId", "name email profile.storeName")
    .populate("distributorId", "name email profile.companyName");

  await logAdminAction({
    account,
    module: "Payments",
    action: `Payment ${action}: ${previous.status} → ${nextStatus}`,
    request,
    targetType: "Payment",
    targetId: payment._id,
    targetLabel: payment.merchantId?.profile?.storeName || payment.merchantId?.name || String(payment._id),
    before: { status: previous.status },
    after: { status: nextStatus },
  });

  return Response.json({ success: true, payment }, { status: 200 });
}

// POST /api/admin/payments — record a manual payment (e.g. offline/bank
// transfer collected outside the gateway) against a merchant.
export async function POST(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = requirePaymentsAccess(account, "edit");
  if (denied) return denied;

  const { merchantId, amount, tax, description, subscriptionId, distributorId } = await request.json();
  if (!merchantId || !amount || Number(amount) <= 0) {
    return Response.json(
      { success: false, error: "merchantId and a positive amount are required" },
      { status: 400 },
    );
  }

  const taxAmount = Number(tax) || 0;
  const payment = await Payment.create({
    merchantId,
    subscriptionId: subscriptionId || null,
    distributorId: distributorId || null,
    ownerId: merchantId,
    ownerType: "merchant",
    amount: Number(amount),
    tax: taxAmount,
    totalAmount: Number(amount) + taxAmount,
    paymentGateway: "direct",
    paymentMethod: "manual",
    status: "success",
    description: description || "Manual payment recorded by admin",
  });

  await logAdminAction({
    account,
    module: "Payments",
    action: "Recorded manual payment",
    request,
    targetType: "Payment",
    targetId: payment._id,
    targetLabel: description || "Manual payment",
    after: { amount: payment.amount, tax: payment.tax, totalAmount: payment.totalAmount },
    reason: description || null,
  });

  return Response.json({ success: true, payment }, { status: 201 });
}
