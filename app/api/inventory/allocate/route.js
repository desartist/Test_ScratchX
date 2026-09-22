import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InventoryService from '@/lib/inventoryService';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();

    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;
    const userRole = account.role;
    const userId = account._id.toString();
    const merchantId = request.headers.get('x-merchant-id') || userId;

    // Authorization: Only Merchant, Manager, and Super_Admin can allocate inventory
    if (!hasPermission(userRole, 'inventory:allocate')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { allocationType, campaignId, quantity } = body;

    // Validate allocation type
    if (!allocationType || !['campaign', 'store'].includes(allocationType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid allocation type. Must be "campaign" or "store"', data: null },
        { status: 400 }
      );
    }

    if (!campaignId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'campaignId and quantity are required. Quantity must be > 0', data: null },
        { status: 400 }
      );
    }

    let result;

    if (allocationType === 'campaign') {
      // Allocate to campaign
      result = await InventoryService.allocateToCampaign(
        merchantId,
        campaignId,
        quantity,
        userId
      );

      return NextResponse.json(
        {
          success: true,
          data: result,
          message: 'Inventory allocated to campaign successfully'
        },
        { status: 200 }
      );
    } else if (allocationType === 'store') {
      // Allocate to store
      const { storeId } = body;
      if (!storeId) {
        return NextResponse.json(
          { success: false, error: 'storeId is required for store allocation', data: null },
          { status: 400 }
        );
      }

      result = await InventoryService.allocateToStore(
        merchantId,
        campaignId,
        storeId,
        quantity,
        userId
      );

      return NextResponse.json(
        {
          success: true,
          data: result,
          message: `Inventory ${result.isNew ? 'allocated' : 'reallocated'} to store successfully`
        },
        { status: result.isNew ? 201 : 200 }
      );
    }
  } catch (error) {
    console.error('Error allocating inventory:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, data: null },
        { status: 400 }
      );
    }

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
