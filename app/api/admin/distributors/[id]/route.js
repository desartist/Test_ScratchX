import { connectDB } from "@/lib/connectDB";
import { requireAuth } from "@/lib/auth";
import Account from "@/models/accountModel";
import Commission from "@/models/commissionModel";
import { inventoryService } from "@/lib/services/distributor";

function superAdminOnly(account) {
  if (account.role !== "Super_Admin") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// GET /api/admin/distributors/[id] — a distributor's full 360 detail:
// assigned retailers, scratch inventory, and commission summary. Reuses the
// same Commission/inventoryService aggregations as the distributor's own
// /api/distributor/dashboard, just parameterized by the target id instead
// of the caller's own account.
export async function GET(request, { params }) {
  await connectDB();
  const { account, error } = await requireAuth();
  if (error) return error;
  const denied = superAdminOnly(account);
  if (denied) return denied;

  const { id } = await params;

  const distributor = await Account.findOne({ _id: id, role: "Distributor" }).select("-password -__v");
  if (!distributor) {
    return Response.json({ success: false, error: "Distributor not found" }, { status: 404 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const WHOLESALE_MATCH = { "profile.businessModel": "Wholesale" };

  const [
    retailers,
    totalRetailers,
    activeRetailers,
    wholesaleCount,
    commissionAgg,
    commissionThisMonthAgg,
    inventorySummary,
  ] = await Promise.all([
    Account.find({ role: "Merchant", parentId: distributor._id })
      .select("name email profile status createdAt scratchCards")
      .sort({ createdAt: -1 })
      .limit(50),
    Account.countDocuments({ role: "Merchant", parentId: distributor._id }),
    Account.countDocuments({ role: "Merchant", parentId: distributor._id, status: "active" }),
    Account.countDocuments({ role: "Merchant", parentId: distributor._id, ...WHOLESALE_MATCH }),
    Commission.aggregate([
      { $match: { distributorId: distributor._id } },
      { $group: { _id: "$status", total: { $sum: "$totalEarning" }, count: { $sum: 1 } } },
    ]),
    Commission.aggregate([
      { $match: { distributorId: distributor._id, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalEarning" } } },
    ]),
    inventoryService.getDistributorInventory(distributor._id),
  ]);

  const commission = { earned: 0, approved: 0, paid: 0, pending: 0, pendingAmount: 0 };
  for (const row of commissionAgg) {
    commission.earned += row.total;
    if (row._id === "approved") commission.approved = row.total;
    if (row._id === "paid") commission.paid = row.total;
    if (row._id === "pending") {
      commission.pending = row.count;
      commission.pendingAmount = row.total;
    }
  }

  const core = inventorySummary.plans.CORE || { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0 };
  const smart = inventorySummary.plans.SMART || { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0 };

  return Response.json(
    {
      success: true,
      distributor,
      metrics: {
        totalRetailers,
        activeRetailers,
        wholesaleCount,
        retailCount: totalRetailers - wholesaleCount,
        monthlyEarning: commissionThisMonthAgg[0]?.total || 0,
      },
      inventory: { core, smart },
      commission,
      retailers,
    },
    { status: 200 },
  );
}
