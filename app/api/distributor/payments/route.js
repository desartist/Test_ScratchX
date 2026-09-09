import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Payment from "@/models/paymentModel";

// GET /api/distributor/payments — retailer payments attributed to this
// distributor (Payment.distributorId, set when a retailer pays through
// Razorpay for a plan sold via this distributor). Read-only: raw payment
// transactions, distinct from Commission Summary (/commissions), which
// shows the distributor's own margin on top of these payments.
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  if (account.role !== "Distributor") {
    return Response.json({ success: false, error: "Only distributors can view payments" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const status = searchParams.get("status");
  const skip = (page - 1) * limit;

  const query = { distributorId: account._id };
  if (status && status !== "all") query.status = status;

  const [payments, total, statusAgg] = await Promise.all([
    Payment.find(query)
      .populate("merchantId", "name profile.storeName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
    Payment.aggregate([
      { $match: { distributorId: account._id } },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  const byStatus = Object.fromEntries(statusAgg.map((r) => [r._id, { count: r.count, total: r.total }]));

  return Response.json(
    {
      success: true,
      payments: payments.map((p) => ({
        _id: p._id,
        retailerName: p.merchantId?.profile?.storeName || p.merchantId?.name || "Unknown",
        amount: p.amount,
        tax: p.tax,
        totalAmount: p.totalAmount,
        status: p.status,
        paymentGateway: p.paymentGateway,
        description: p.description,
        createdAt: p.createdAt,
      })),
      total,
      page,
      limit,
      metrics: {
        collected: byStatus.success?.total || 0,
        pending: byStatus.pending?.total || 0,
        failed: byStatus.failed?.total || 0,
        refunded: byStatus.refunded?.total || 0,
      },
    },
    { status: 200 },
  );
}
