/**
 * GET /api/admin/analytics
 *
 * Get comprehensive analytics for admin dashboard
 * Admin role required
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAdmin } from '@/lib/adminAuth';
import Subscription from '@/models/subscriptionModel';
import Payment from '@/models/paymentModel';
import SubscriptionPlan from '@/models/subscriptionPlanModel';
import Invoice from '@/models/invoiceModel';

export async function GET(request) {
  try {
    await connectDB();

    // Verify admin access
    await requireAdmin();

    // Get date range from query
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get subscription statistics
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      subscriptionsByPlan,
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'trial' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      Subscription.aggregate([
        { $group: { _id: '$planName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Get revenue statistics
    const [totalRevenue, totalTransactions, revenueByPlan, revenueByPeriod] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.countDocuments({ status: 'success', createdAt: { $gte: startDate } }),
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: startDate } } },
        { $group: { _id: '$planName', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
      ]),
      Payment.aggregate([
        { $match: { status: 'success', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Get plan statistics
    const plans = await SubscriptionPlan.find({}, 'name displayName price').lean();

    // Get invoice statistics
    const [totalInvoices, paidInvoices, outstandingInvoices, totalOutstanding] = await Promise.all([
      Invoice.countDocuments({ issuedDate: { $gte: startDate } }),
      Invoice.countDocuments({ status: 'paid', issuedDate: { $gte: startDate } }),
      Invoice.countDocuments({ status: 'overdue', issuedDate: { $gte: startDate } }),
      Invoice.aggregate([
        { $match: { status: 'overdue', issuedDate: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    // Calculate growth
    const yesterdayStart = new Date(startDate);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(startDate);

    const previousActiveSubscriptions = await Subscription.countDocuments({
      status: 'active',
      createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd },
    });

    const subscriptionGrowth =
      previousActiveSubscriptions > 0
        ? ((activeSubscriptions - previousActiveSubscriptions) / previousActiveSubscriptions) * 100
        : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          period: {
            days,
            startDate: startDate.toISOString(),
            endDate: new Date().toISOString(),
          },
          subscriptions: {
            total: totalSubscriptions,
            active: activeSubscriptions,
            trial: trialSubscriptions,
            cancelled: cancelledSubscriptions,
            growth: parseFloat(subscriptionGrowth.toFixed(2)),
            byPlan: subscriptionsByPlan.map((p) => ({
              plan: p._id,
              count: p.count,
              percentage: ((p.count / totalSubscriptions) * 100).toFixed(1),
            })),
          },
          revenue: {
            total: (totalRevenue[0]?.total || 0).toFixed(2),
            transactions: totalTransactions,
            average: totalTransactions > 0
              ? ((totalRevenue[0]?.total || 0) / totalTransactions).toFixed(2)
              : '0',
            byPlan: revenueByPlan.map((p) => ({
              plan: p._id,
              revenue: p.revenue,
              transactions: p.count,
              average: (p.revenue / p.count).toFixed(2),
            })),
            byDay: revenueByPeriod,
          },
          invoices: {
            total: totalInvoices,
            paid: paidInvoices,
            outstanding: outstandingInvoices,
            totalOutstanding: (totalOutstanding[0]?.total || 0).toFixed(2),
          },
          plans: plans.map((p) => ({
            name: p.name,
            displayName: p.displayName,
            price: p.price,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error fetching analytics',
      },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}
