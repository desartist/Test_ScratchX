import { connectDB } from '@/lib/connectDB';
import CouponRange from '@/models/couponRangeModel';
import Campaign from '@/models/campaignModel';
import CampaignService from '@/lib/campaignService';

/**
 * DELETE /api/ranges/[id] - Delete a coupon range
 * Requires: x-user-role (Merchant), x-user-id headers
 * Only merchant who owns the associated campaign can delete the range
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    if (!userRole || !userId) {
      return Response.json(
        { success: false, error: 'Unauthorized', data: null, message: null },
        { status: 401 }
      );
    }

    if (userRole !== 'Merchant') {
      return Response.json(
        { success: false, error: 'Access denied', data: null, message: null },
        { status: 403 }
      );
    }

    // Get range and verify campaign ownership
    const range = await CouponRange.findById(params.id);
    if (!range) {
      return Response.json(
        { success: false, error: 'Range not found', data: null, message: null },
        { status: 404 }
      );
    }

    const campaign = await Campaign.findById(range.campaignId);
    if (!campaign || campaign.merchantId.toString() !== userId) {
      return Response.json(
        { success: false, error: 'Access denied', data: null, message: null },
        { status: 403 }
      );
    }

    // Delete range using service
    await CampaignService.deleteRange(params.id);

    return Response.json(
      { success: true, data: null, message: 'Range deleted', error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete range error:', error);
    return Response.json(
      { success: false, error: error.message, data: null, message: null },
      { status: 400 }
    );
  }
}
