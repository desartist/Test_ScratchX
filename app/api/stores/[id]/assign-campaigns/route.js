import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';

/**
 * POST /api/stores/[id]/assign-campaigns
 *
 * Assign campaigns to a store
 *
 * Request Body:
 * {
 *   campaignIds: string[]  // Array of campaign IDs to assign
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   assignedCount: number,           // Number of newly assigned campaigns
 *   skippedCount: number,            // Number of already-assigned campaigns (informational)
 *   message: string,                 // Human-readable summary
 *   data: {
 *     assigned: Array<{ campaignId, campaignName }>,
 *     skipped: Array<{ campaignId, campaignName }>
 *   }
 * }
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id: storeId } = await params;
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: Only Merchant, Manager, and Super_Admin can assign campaigns
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

    // Assign campaigns to store
    const result = await StoreService.assignCampaignsToStore(
      storeId,
      campaignIds,
      userId
    );

    // Count assigned vs skipped campaigns
    const assignedCount = result.assigned?.length || 0;
    const skippedCount = result.skipped?.length || 0;

    return NextResponse.json(
      {
        success: true,
        assignedCount,
        skippedCount,
        message: skippedCount > 0
          ? `${assignedCount} campaign${assignedCount !== 1 ? 's' : ''} assigned, ${skippedCount} already assigned`
          : `${assignedCount} campaign${assignedCount !== 1 ? 's' : ''} assigned successfully`,
        data: result
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error assigning campaigns to store:', error);

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
        error: 'Failed to assign campaigns to store',
        data: null
      },
      { status: 500 }
    );
  }
}
