/**
 * GET /api/distributor/commissions - Get commission history
 * GET /api/distributor/commissions/summary - Get commission summary
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import { commissionService } from '@/lib/services/distributor';
import DistributorCommission from '@/models/distributorCommissionModel';

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

    const url = new URL(request.url);
    const endpoint = url.pathname.split('/').pop();
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Handle summary endpoint
    if (endpoint === 'summary') {
      const summary = await commissionService.getCommissionSummary(
        account._id,
        startDate || undefined,
        endDate || undefined
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            totalEarned: summary.totalEarned,
            totalApproved: summary.totalApproved,
            totalPaid: summary.totalPaid,
            pendingCount: summary.pending,
            approvedCount: summary.approved,
            paidCount: summary.paid,
            commissionCount: summary.commissions.length,
          },
        },
        { status: 200 }
      );
    }

    // Handle history endpoint (default)
    const query = { distributorId: account._id };

    if (status) query.status = status;

    if (startDate || endDate) {
      query.earnedAt = {};
      if (startDate) query.earnedAt.$gte = new Date(startDate);
      if (endDate) query.earnedAt.$lte = new Date(endDate);
    }

    const commissions = await DistributorCommission.find(query)
      .populate('retailerId', 'email name profile')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await DistributorCommission.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: {
          commissions: commissions.map((c) => ({
            id: c._id,
            commissionId: c.commissionId,
            retailerId: c.retailerId?._id,
            retailerName: c.retailerId?.profile?.companyName || c.retailerId?.name,
            planType: c.planType,
            amount: c.commissionAmount,
            percentage: c.commissionPercentage,
            status: c.status,
            earnedAt: c.earnedAt,
            approvedAt: c.approvedAt,
            paidAt: c.paidAt,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
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
