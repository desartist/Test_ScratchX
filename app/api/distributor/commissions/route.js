import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { getLoginToken } from '@/lib/auth';
import Commission from '@/models/commissionModel';
import Distributor from '@/models/distributorModel';

export async function GET(request) {
  try {
    await connectDB();

    const authToken = await getLoginToken();
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const distributor = await Distributor.findById(authToken.accountId);
    if (!distributor) {
      return NextResponse.json(
        { success: false, error: 'Distributor not found' },
        { status: 404 }
      );
    }

    const query = { distributorId: authToken.accountId };
    if (status) query.status = status;

    const [commissions, total] = await Promise.all([
      Commission.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('salesAmount commissionAmount bonusAmount totalEarning status period createdAt')
        .lean(),
      Commission.countDocuments(query),
    ]);

    const pending = await Commission.aggregate([
      { $match: { distributorId: authToken.accountId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$totalEarning' } } },
    ]);

    const paid = await Commission.aggregate([
      { $match: { distributorId: authToken.accountId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalEarning' } } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        distributor: {
          name: distributor.name,
          email: distributor.email,
          commissionRate: distributor.commission.percentagePerSale,
        },
        commissions,
        summary: {
          pendingEarnings: pending[0]?.total || 0,
          paidEarnings: paid[0]?.total || 0,
          totalEarnings: distributor.totalEarnings,
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
