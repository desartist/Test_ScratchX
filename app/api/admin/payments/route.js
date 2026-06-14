import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Payment from "@/models/paymentModel";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/payments — all payments with pagination and filters
export async function GET(request) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
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
