/**
 * GET /api/distributor/dashboard - Get dashboard metrics and statistics
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import Account from '@/models/accountModel';
import Commission from '@/models/commissionModel';
import Subscription from '@/models/subscriptionModel';
import { inventoryService } from '@/lib/services/distributor';

// Unit MRP (with 18% GST) — must match /api/subscription/plans (price.withGST)
// and app/api/distributor/plans/create-order/route.js.
const PLAN_UNIT_MRP = { CORE: 2477, SMART: 3539 };
const RECHARGE_QUEUE_LIMIT = 5;

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

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfPrevWeek = new Date(now);
    startOfPrevWeek.setDate(now.getDate() - 14);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Accounts created before businessModel existed have no value set —
    // treat those as Retail (the pre-existing, default kind of merchant).
    const WHOLESALE_MATCH = { 'profile.businessModel': 'Wholesale' };

    const [
      totalRetailers,
      activeRetailers,
      retailersThisWeek,
      retailersPrevWeek,
      wholesaleBusinesses,
      commissionAgg,
      commissionThisMonthAgg,
      pendingCommissionMerchants,
      inventorySummary,
      retailersForQueue,
    ] = await Promise.all([
      Account.countDocuments({ role: 'Merchant', parentId: account._id }),
      Account.countDocuments({ role: 'Merchant', parentId: account._id, status: 'active' }),
      Account.countDocuments({ role: 'Merchant', parentId: account._id, createdAt: { $gte: startOfWeek } }),
      Account.countDocuments({
        role: 'Merchant',
        parentId: account._id,
        createdAt: { $gte: startOfPrevWeek, $lt: startOfWeek },
      }),
      Account.countDocuments({ role: 'Merchant', parentId: account._id, ...WHOLESALE_MATCH }),
      Commission.aggregate([
        { $match: { distributorId: account._id } },
        { $group: { _id: '$status', total: { $sum: '$totalEarning' }, count: { $sum: 1 } } },
      ]),
      Commission.aggregate([
        { $match: { distributorId: account._id, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalEarning' } } },
      ]),
      Commission.distinct('merchantId', { distributorId: account._id, status: 'pending' }),
      inventoryService.getDistributorInventory(account._id),
      Account.find({ role: 'Merchant', parentId: account._id }).select('_id name profile'),
    ]);

    const commission = { earned: 0, approved: 0, paid: 0, pending: 0, pendingAmount: 0 };
    for (const row of commissionAgg) {
      commission.earned += row.total;
      if (row._id === 'approved') commission.approved = row.total;
      if (row._id === 'paid') commission.paid = row.total;
      if (row._id === 'pending') {
        commission.pending = row.count;
        commission.pendingAmount = row.total;
      }
    }
    const monthlyMargin = commissionThisMonthAgg[0]?.total || 0;
    const pendingRetailerCount = pendingCommissionMerchants.length;
    const retailBusinesses = totalRetailers - wholesaleBusinesses;

    // Retailer growth trend (week-over-week) — only shown when there's a real
    // prior-week baseline to compare against.
    let retailerGrowthPercent = null;
    if (retailersPrevWeek > 0) {
      retailerGrowthPercent = Math.round(
        ((retailersThisWeek - retailersPrevWeek) / retailersPrevWeek) * 100
      );
    }

    const core = inventorySummary.plans.CORE || { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0 };
    const smart = inventorySummary.plans.SMART || { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0 };

    // Recharge queue: retailers whose unlimited-scratches entitlement has
    // lapsed or is about to (within 10 days) — soonest/most-overdue first.
    const retailerIds = retailersForQueue.map((r) => r._id);
    const subs = retailerIds.length
      ? await Subscription.find({
          ownerId: { $in: retailerIds },
          ownerType: 'merchant',
          status: { $in: ['trial', 'active'] },
        }).select('ownerId planType unlimitedScratches.validUntil')
      : [];

    const subByOwner = {};
    for (const s of subs) subByOwner[s.ownerId.toString()] = s;

    const rechargeQueue = retailersForQueue
      .map((r) => {
        const sub = subByOwner[r._id.toString()];
        const validUntil = sub?.unlimitedScratches?.validUntil;
        if (!validUntil) return null;
        const daysLeft = Math.ceil((new Date(validUntil) - now) / (1000 * 60 * 60 * 24));
        if (daysLeft > 10) return null; // not urgent yet
        return {
          retailerId: r._id,
          storeName: r.profile?.storeName || r.name,
          location: r.profile?.storeLocation || null,
          planType: sub.planType,
          daysLeft,
          validUntil,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, RECHARGE_QUEUE_LIMIT);

    const dashboard = {
      distributor: {
        name: account.name,
        territory: account.profile?.territory || null,
        region: account.profile?.region || null,
      },
      metrics: {
        totalRetailers,
        activeRetailers,
        retailersThisWeek,
        retailerGrowthPercent,
        totalBusinesses: totalRetailers,
        retailBusinesses,
        wholesaleBusinesses,
        monthlyMargin,
        licensesPurchased: core.totalPurchased + smart.totalPurchased,
        pendingPayoutAmount: commission.pendingAmount,
        pendingRetailerCount,
      },
      inventory: {
        core: {
          ...core,
          percentageUtilized: core.totalPurchased
            ? Math.round((core.totalAssigned / core.totalPurchased) * 100)
            : 0,
          unitMRP: PLAN_UNIT_MRP.CORE,
        },
        smart: {
          ...smart,
          percentageUtilized: smart.totalPurchased
            ? Math.round((smart.totalAssigned / smart.totalPurchased) * 100)
            : 0,
          unitMRP: PLAN_UNIT_MRP.SMART,
        },
      },
      commission,
      rechargeQueue,
      alerts: [],
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
