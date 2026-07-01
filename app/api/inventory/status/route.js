import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InventoryService from '@/lib/inventoryService';
import { hasPermission } from '@/lib/permissions';
import { NotFoundError } from '@/lib/errors';

export async function GET(request) {
  try {
    await connectDB();

    // Get user info from headers
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: User must have inventory:read permission
    if (!hasPermission(userRole, 'inventory:read')) {
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

    if (!type || !['campaign', 'store'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type query parameter is required. Must be "campaign" or "store"', data: null },
        { status: 400 }
      );
    }

    let data;

    if (type === 'campaign') {
      if (!campaignId) {
        return NextResponse.json(
          { success: false, error: 'campaignId is required for campaign type', data: null },
          { status: 400 }
        );
      }

      data = await InventoryService.getCampaignInventoryStatus(campaignId);
    } else if (type === 'store') {
      if (!storeId) {
        return NextResponse.json(
          { success: false, error: 'storeId is required for store type', data: null },
          { status: 400 }
        );
      }

      data = await InventoryService.getStoreInventoryStatus(storeId);
    }

    return NextResponse.json(
      {
        success: true,
        data,
        message: 'Inventory status retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching inventory status:', error);

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
