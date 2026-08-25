import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import Commission from '@/models/commissionModel';

// GET /api/distributor/dashboard-charts — real, distributor-scoped chart
// data for the dashboard: daily commission earned (last N days) and top
// retailers by commission earned. Mirrors the same real-aggregation
// approach as /api/admin/dashboard-charts, scoped to this distributor via
// Commission.distributorId instead of platform-wide.
export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can access this' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days')) || 30));
    // UTC-consistent throughout — mixing local setHours/setDate with the
    // UTC-based $dateToString grouping below silently drops "today" (or
    // shifts every bucket by a day) whenever the server isn't running in
    // UTC, exactly like the bug fixed earlier in admin/activity-trend.
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [trendRows, topRetailerRows] = await Promise.all([
      Commission.aggregate([
        { $match: { distributorId: account._id, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            earned: { $sum: '$totalEarning' },
          },
        },
      ]),
      Commission.aggregate([
        { $match: { distributorId: account._id } },
        { $group: { _id: '$merchantId', earned: { $sum: '$totalEarning' } } },
        { $match: { earned: { $gt: 0 } } },
        {
          $lookup: {
            from: 'accounts',
            localField: '_id',
            foreignField: '_id',
            as: 'merchant',
          },
        },
        { $unwind: '$merchant' },
        {
          $project: {
            _id: 0,
            merchantId: '$_id',
            name: { $ifNull: ['$merchant.profile.storeName', '$merchant.name'] },
            earned: 1,
          },
        },
        { $sort: { earned: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const trendMap = Object.fromEntries(trendRows.map((r) => [r._id, r.earned]));
    const commissionTrend = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      commissionTrend.push({
        date: key,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
        earned: trendMap[key] || 0,
      });
    }

    return NextResponse.json({
      success: true,
      commissionTrend,
      topRetailers: topRetailerRows,
    });
  } catch (e) {
    console.error('[distributor/dashboard-charts]', e);
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard charts' },
      { status: 500 },
    );
  }
}
