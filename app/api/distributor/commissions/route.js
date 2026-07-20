/**
 * GET /api/distributor/commissions - list commission records + summary totals
 * for the logged-in distributor.
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import Commission from '@/models/commissionModel';

export async function GET(request) {
  try {
    await connectDB();
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;

    if (account.role !== 'Distributor') {
      return NextResponse.json(
        { success: false, error: 'Only distributors can view commissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));

    const baseQuery = { distributorId: account._id };
    const query = { ...baseQuery };
    if (status && status !== 'all') query.status = status;

    const [commissions, total, summaryAgg] = await Promise.all([
      Commission.find(query)
        .populate('merchantId', 'email name profile')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Commission.countDocuments(query),
      Commission.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$totalEarning' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = {
      totalEarned: 0,
      totalApproved: 0,
      totalPaid: 0,
      pendingCount: 0,
      approvedCount: 0,
      paidCount: 0,
      commissionRate: account.profile?.commissionRate ?? 0,
    };
    for (const row of summaryAgg) {
      summary.totalEarned += row.total;
      if (row._id === 'approved') {
        summary.totalApproved = row.total;
        summary.approvedCount = row.count;
      } else if (row._id === 'paid') {
        summary.totalPaid = row.total;
        summary.paidCount = row.count;
      } else if (row._id === 'pending') {
        summary.pendingCount = row.count;
      }
    }

    // Server-side search on merchant name/email (post-populate, in-memory —
    // commission volume per distributor is small enough that this is fine).
    let filtered = commissions;
    if (search) {
      const term = search.toLowerCase();
      filtered = commissions.filter((c) => {
        const name = c.merchantId?.profile?.storeName || c.merchantId?.name || '';
        const email = c.merchantId?.email || '';
        return name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          commissions: filtered.map((c) => ({
            id: c._id,
            merchantId: c.merchantId?._id,
            merchantName: c.merchantId?.profile?.storeName || c.merchantId?.name || 'Unknown',
            merchantEmail: c.merchantId?.email,
            amount: c.totalEarning,
            percentage: c.commissionRate,
            status: c.status,
            earnedAt: c.createdAt,
            approvedAt: c.approvedAt,
            paidAt: c.paidAt,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
          summary,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching commissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commissions' },
      { status: 500 }
    );
  }
}
