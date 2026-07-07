import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import StoreService from '@/lib/storeService';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';

/**
 * DELETE /api/stores/delete
 * Thin wrapper around StoreService.deleteStore — the same cascade/guard
 * logic used by /api/stores/[id] DELETE, so both entry points in the UI
 * (store list page vs. store detail page) behave identically.
 *
 * Request body: { storeId: "..." }
 */
export async function POST(request) {
  try {
    await connectDB();

    // Get user info
    const userRole = request.headers.get('x-user-role');

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

    const store = await StoreService.deleteStore(storeId);

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

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
