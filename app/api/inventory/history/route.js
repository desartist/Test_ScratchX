import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InventoryService from '@/lib/inventoryService';
import { hasPermission } from '@/lib/permissions';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();

    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;
    const userRole = account.role;
    const userId = account._id.toString();
    const merchantId = request.headers.get('x-merchant-id') || userId;

    // Authorization
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

    // Get allocation history
    const history = await InventoryService.getAllocationHistory(
      merchantId,
      { campaignId, storeId, startDate, endDate }
    );

    return NextResponse.json(
      {
        success: true,
        data: history,
        count: history.length,
        message: 'Allocation history retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching allocation history:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
