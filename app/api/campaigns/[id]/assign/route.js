import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import CampaignService from '@/lib/campaignService';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';

/**
 * POST /api/campaigns/[id]/assign
 *
 * Assign stores to a campaign with store snapshot creation
 *
 * Request Body:
 * {
 *   storeIds: string[]               // Array of store IDs to assign
 *   quantityPerStore?: number        // (Optional) Scratches per store, defaults to 1000
 * }
 *
 * Response:
 * {
 *   success: boolean,                // Always true if operation completes successfully
 *   assignedCount: number,           // Number of newly assigned stores
 *   skippedCount: number,            // Number of already-assigned stores (informational)
 *   message: string,                 // Human-readable summary
 *   data: {
 *     successful: Array<{ storeId, storeName, allocated, snapshot }>,
 *     failed: Array<{ storeId, storeName, error }>,  // Actually "already assigned" (skipped)
 *     summary: { total, success, failed }
 *   }
 * }
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id: campaignId } = await params;
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: Only Merchant, Manager, and Super_Admin can assign campaigns
    if (!hasPermission(userRole, 'campaign:update')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', data: null },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { storeIds, quantityPerStore = 1000 } = body;

    // Validate storeIds
    if (!Array.isArray(storeIds) || storeIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'storeIds must be a non-empty array',
          data: null
        },
        { status: 400 }
      );
    }

    // Assign campaign to stores with snapshot creation
    const result = await CampaignService.assignCampaignToStores(
      campaignId,
      storeIds,
      quantityPerStore,
      userId
    );

    // Count assigned vs skipped stores
    // Assigned: stores that were successfully added to the campaign
    // Skipped: stores that were already assigned (not an error)
    const assignedCount = result.summary.success || 0;
    const skippedCount = result.summary.failed || 0;

    return NextResponse.json(
      {
        success: true,  // Success = assignment operation completed (even if some were skipped)
        assignedCount,
        skippedCount,
        message: skippedCount > 0
          ? `${assignedCount} store${assignedCount !== 1 ? 's' : ''} assigned, ${skippedCount} already assigned`
          : `${assignedCount} store${assignedCount !== 1 ? 's' : ''} assigned successfully`,
        data: result
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error assigning campaign to stores:', error);

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
        error: 'Failed to assign stores to campaign',
        data: null
      },
      { status: 500 }
    );
  }
}
