/**
 * GET /api/distributor/dashboard - Get dashboard metrics and statistics
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import Account from '@/models/accountModel';
import Commission from '@/models/commissionModel';

export async function GET() {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can access dashboard' },
        { status: 403 }
      );
    }

    const [totalRetailers, activeRetailers, commissionAgg] = await Promise.all([
      Account.countDocuments({ role: 'Merchant', parentId: account._id }),
      Account.countDocuments({ role: 'Merchant', parentId: account._id, status: 'active' }),
      Commission.aggregate([
        { $match: { distributorId: account._id } },
        { $group: { _id: '$status', total: { $sum: '$totalEarning' }, count: { $sum: 1 } } },
      ]),
    ]);

    const commission = { earned: 0, approved: 0, paid: 0, pending: 0 };
    for (const row of commissionAgg) {
      commission.earned += row.total;
      if (row._id === 'approved') commission.approved = row.total;
      if (row._id === 'paid') commission.paid = row.total;
      if (row._id === 'pending') commission.pending = row.count;
    }

    // Plan purchasing/inventory and order history for distributors isn't
    // backed by a real system yet (no working purchase/inventory pipeline
    // exists) — reporting honest zeros here rather than fabricating numbers.
    const dashboard = {
      metrics: {
        currentBalance: 0,
        totalPlansInventory: 0,
        assignedPlans: 0,
        remainingPlans: 0,
        activePlans: activeRetailers,
        monthlyRevenue: 0,
        monthlyProfit: commission.earned,
        totalRetailers,
      },
      inventory: {
        core: { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0, percentageUtilized: 0 },
        smart: { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0, percentageUtilized: 0 },
      },
      commission,
      orders: {
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalSpent: 0,
        totalPlansOrdered: 0,
      },
      alerts: [],
      stats: {
        activeRetailers,
        totalRetailersEver: totalRetailers,
        revokedPlans: 0,
        totalProfitEarned: commission.earned,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: dashboard,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
