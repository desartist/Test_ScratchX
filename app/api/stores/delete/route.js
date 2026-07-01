import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Store from '@/models/storeModel';
import mainStoreService from '@/lib/mainStoreService';
import { hasPermission } from '@/lib/permissions';

/**
 * DELETE /api/stores/delete
 * Protected delete endpoint for stores with main store protection
 *
 * Request body: { storeId: "..." }
 */
export async function POST(request) {
  try {
    await connectDB();

    // Get user info
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization check
    if (!hasPermission(userRole, 'store:delete')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { storeId } = await request.json();

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // Check if this is the main store
    const canDelete = await mainStoreService.canDeleteStore(storeId, userId);

    if (!canDelete.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: canDelete.message,
          isMainStore: canDelete.isMainStore,
        },
        { status: 403 }
      );
    }

    // Perform soft delete
    const store = await Store.findByIdAndUpdate(
      storeId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'deleted',
      },
      { new: true }
    );

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Store deleted successfully',
        store,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Stores Delete API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
