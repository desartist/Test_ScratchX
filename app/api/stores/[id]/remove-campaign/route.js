import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';

/**
 * POST /api/stores/[id]/remove-campaign
 *
 * Remove one or more campaigns from a store
 *
 * Request Body:
 * {
 *   campaignIds: string[]  // Array of campaign IDs to remove
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   removedCount: number,    // Number of removed campaigns
 *   failedCount: number,     // Number of failed removals
 *   message: string,
 *   data: {
 *     removed: Array<{ campaignId, campaignName }>,
 *     failed: Array<{ campaignId, campaignName, error }>
 *   }
 * }
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id: storeId } = await params;
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: Only Merchant, Manager, and Super_Admin can remove campaigns
    if (!hasPermission(userRole, 'store:update')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { campaignIds } = body;

    // Validate campaignIds
    if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'campaignIds must be a non-empty array',
          data: null
        },
        { status: 400 }
      );
    }

    // Dynamic import to avoid circular dependencies
    const { default: StoreService } = await import('@/lib/storeService');

    // Remove campaigns from store
    const result = await StoreService.removeCampaignsFromStore(
      storeId,
      campaignIds,
      userId
    );

    const removedCount = result.removed?.length || 0;
    const failedCount = result.failed?.length || 0;

    return NextResponse.json(
      {
        success: removedCount > 0,
        removedCount,
        failedCount,
        message: failedCount > 0
          ? `${removedCount} campaign${removedCount !== 1 ? 's' : ''} removed, ${failedCount} failed`
          : `${removedCount} campaign${removedCount !== 1 ? 's' : ''} removed successfully`,
        data: result
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error removing campaigns from store:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          data: null
        },
        { status: 400 }
      );
    }

    // Handle not found errors
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          data: null
        },
        { status: 404 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove campaigns from store',
        data: null
      },
      { status: 500 }
    );
  }
}
