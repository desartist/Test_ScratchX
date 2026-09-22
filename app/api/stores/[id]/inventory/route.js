import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import StoreService from '@/lib/storeService';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { id: storeId } = params;
    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;
    const userRole = account.role;
    const userId = account._id.toString();

    // Authorization: Only Merchant, Manager, and Super_Admin can update inventory
    if (!hasPermission(userRole, 'inventory:allocate')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { quantity, action, remarks } = body;

    if (!quantity || quantity === 0) {
      return NextResponse.json(
        { success: false, error: 'quantity is required and must not be zero', data: null },
        { status: 400 }
      );
    }

    if (!action || !['inventory_added', 'inventory_removed'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be "inventory_added" or "inventory_removed"', data: null },
        { status: 400 }
      );
    }

    // Update inventory
    const result = await StoreService.updateStoreInventory(
      storeId,
      quantity,
      action,
      userId,
      remarks
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Store inventory updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating store inventory:', error);

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

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id: storeId } = params;
    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;
    const userRole = account.role;
    const userId = account._id.toString();

    // Authorization
    if (!hasPermission(userRole, 'inventory:read')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Get inventory summary
    const summary = await StoreService.getStoreInventorySummary(storeId);

    return NextResponse.json(
      {
        success: true,
        data: summary,
        message: 'Store inventory summary retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching store inventory:', error);

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
