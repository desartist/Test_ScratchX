import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import CampaignService from '@/lib/campaignService';
import { hasPermission } from '@/lib/permissions';
import { ValidationError, NotFoundError } from '@/lib/errors';

/**
 * DELETE /api/campaigns/[id]/stores/[storeId]
 *
 * Remove a store from campaign (soft delete - marks assignment as 'removed')
 * This preserves the historical record for audit trail.
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   assignment: object - updated assignment with status: 'removed'
 * }
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id: campaignId, storeId } = await params;
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Authorization: Only Merchant, Manager, and Super_Admin can remove stores from campaigns
    if (!hasPermission(userRole, 'campaign:update')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          data: null
        },
        { status: 403 }
      );
    }

    // Validate parameters
    if (!campaignId || !storeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campaign ID and Store ID are required',
          data: null
        },
        { status: 400 }
      );
    }

    // Remove store from campaign (soft delete)
    const result = await CampaignService.removeStoreFromCampaign(
      campaignId,
      storeId,
      userId
    );

    return NextResponse.json(
      {
        success: true,
        message: `Store ${storeId} removed from campaign`,
        assignment: result
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error removing store from campaign:', error);

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
        error: 'Failed to remove store from campaign',
        data: null
      },
      { status: 500 }
    );
  }
}
