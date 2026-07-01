import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import CampaignService from '@/lib/campaignService';

/**
 * POST /api/ranges - Create a coupon range for a campaign
 * Requires: x-user-role (Merchant), x-user-id headers
 * Only merchant who owns the campaign can create ranges for it
 */
export async function POST(request) {
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
        { success: false, error: 'Only merchants can create ranges', data: null, message: null },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Verify campaign exists and belongs to merchant
    const campaign = await Campaign.findById(body.campaignId);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found', data: null, message: null },
        { status: 404 }
      );
    }

    if (campaign.merchantId.toString() !== userId) {
      return Response.json(
        { success: false, error: 'Access denied', data: null, message: null },
        { status: 403 }
      );
    }

    // Validate required fields
    const requiredFields = ['campaignId', 'startCode', 'endCode', 'totalCodes', 'generatedDate', 'expiryDate'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return Response.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          data: null,
          message: null
        },
        { status: 400 }
      );
    }

    // Create range using service
    const range = await CampaignService.createRange(body.campaignId, {
      startCode: body.startCode,
      endCode: body.endCode,
      totalCodes: body.totalCodes,
      generatedDate: new Date(body.generatedDate),
      expiryDate: new Date(body.expiryDate)
    });

    return Response.json(
      { success: true, data: range.toObject ? range.toObject() : range, error: null, message: null },
      { status: 201 }
    );
  } catch (error) {
    console.error('Range creation error:', error);
    return Response.json(
      { success: false, error: error.message, data: null, message: null },
      { status: 400 }
    );
  }
}
