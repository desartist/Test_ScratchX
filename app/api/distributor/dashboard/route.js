/**
 * GET /api/distributor/dashboard - Get dashboard metrics and statistics
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import {
  commissionService,
  inventoryService,
  purchaseService,
  assignmentService,
  transactionService,
} from '@/lib/services/distributor';

export async function GET(request) {
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

    // Fetch all metrics in parallel
    const [inventory, balance, orderStats, assignmentStats, commissionSummary] =
      await Promise.all([
        inventoryService.getDistributorInventory(account._id),
        transactionService.getCurrentBalance(account._id),
        purchaseService.getOrderStats(account._id,
          new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          new Date()
        ),
        assignmentService.getAssignmentStats(account._id),
        commissionService.getCommissionSummary(account._id,
          new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          new Date()
        ),
      ]);

    // Get low inventory alerts
    const alerts = await inventoryService.getLowInventoryAlerts(account._id);

    const dashboard = {
      // Metrics cards
      metrics: {
        currentBalance: balance.balance,
        totalPlansInventory:
          inventory.totalPurchased,
        assignedPlans:
          inventory.totalAssigned,
        remainingPlans:
          inventory.totalRemaining,
        activePlans: assignmentStats.activeAssignments,
        monthlyRevenue: orderStats.totalSpent,
        monthlyProfit: commissionSummary.totalEarned,
        totalRetailers: assignmentStats.totalAssignments,
      },

      // Plan inventory breakdown
      inventory: {
        core: inventory.plans.CORE || {
          totalPurchased: 0,
          totalAssigned: 0,
          totalRemaining: 0,
          percentageUtilized: 0,
        },
        smart: inventory.plans.SMART || {
          totalPurchased: 0,
          totalAssigned: 0,
          totalRemaining: 0,
          percentageUtilized: 0,
        },
      },

      // Commission breakdown
      commission: {
        earned: commissionSummary.totalEarned,
        approved: commissionSummary.totalApproved,
        paid: commissionSummary.totalPaid,
        pending: commissionSummary.pending,
      },

      // Orders this month
      orders: {
        total: orderStats.totalOrders,
        completed: orderStats.completedOrders,
        pending: orderStats.pendingOrders,
        failed: orderStats.failedOrders,
        totalSpent: orderStats.totalSpent,
        totalPlansOrdered: orderStats.totalPlans,
      },

      // Alerts
      alerts: alerts.map((a) => ({
        type: 'low_inventory',
        planType: a.planType,
        remaining: a.totalRemaining,
        utilization: a.percentageUtilized,
        message: `${a.planType} plan inventory is ${a.percentageUtilized}% utilized`,
      })),

      // Summary stats
      stats: {
        activeRetailers: assignmentStats.activeAssignments,
        totalRetailersEver: assignmentStats.totalAssignments,
        revokedPlans: assignmentStats.revokedAssignments,
        totalProfitEarned: assignmentStats.totalProfit,
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
