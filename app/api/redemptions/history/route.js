import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RedemptionService from '@/lib/redemptionService';
import { hasPermission } from '@/lib/permissions';
import { NotFoundError } from '@/lib/errors';

export async function GET(request) {
  try {
    await connectDB();

    // Get user info from headers
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: User must have analytics:read permission
    if (!hasPermission(userRole, 'analytics:read')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit')) || 50;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaignId is required', data: null },
        { status: 400 }
      );
    }

    // Get redemption history
    const result = await RedemptionService.getCampaignRedemptionHistory(
      campaignId,
      { storeId, startDate, endDate, limit }
    );

    return NextResponse.json(
      {
        success: true,
        data: result.transactions,
        total: result.total,
        limit: result.limit,
        message: 'Redemption history retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching redemption history:', error);

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
