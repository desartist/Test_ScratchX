import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RedemptionService from '@/lib/redemptionService';
import { hasPermission } from '@/lib/permissions';
import { NotFoundError } from '@/lib/errors';

export async function GET(request) {
  try {
    await connectDB();

    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization
    if (!hasPermission(userRole, 'analytics:read')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'campaign' or 'store'
    const campaignId = searchParams.get('campaignId');
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!type || !['campaign', 'store'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type query parameter required: campaign or store', data: null },
        { status: 400 }
      );
    }

    let data;

    if (type === 'campaign') {
      if (!campaignId) {
        return NextResponse.json(
          { success: false, error: 'campaignId required for campaign stats', data: null },
          { status: 400 }
        );
      }

      data = await RedemptionService.getCampaignRedemptionHistory(campaignId, {
        startDate,
        endDate,
        limit: 1000
      });
    } else if (type === 'store') {
      if (!storeId) {
        return NextResponse.json(
          { success: false, error: 'storeId required for store stats', data: null },
          { status: 400 }
        );
      }

      data = await RedemptionService.getStoreRedemptionStats(storeId, {
        startDate,
        endDate
      });
    }

    return NextResponse.json(
      {
        success: true,
        data,
        message: 'Redemption statistics retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching redemption stats:', error);

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
