import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import CampaignService from '@/lib/campaignService';

/**
 * Helper to check campaign ownership
 */
async function checkCampaignOwnership(campaignId, userId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    return { owned: false, campaign: null };
  }
  if (campaign.merchantId.toString() !== userId) {
    return { owned: false, campaign };
  }
  return { owned: true, campaign };
}

/**
 * GET /api/campaigns/[id] - Get campaign detail with ranges
 * Requires: x-user-role (Merchant), x-user-id headers
 * Returns: Campaign object with associated ranges
 */
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id: campaignId } = await params;
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

    const { owned, campaign } = await checkCampaignOwnership(campaignId, userId);

    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found', data: null, message: null },
        { status: 404 }
      );
    }

    if (!owned) {
      return Response.json(
        { success: false, error: 'Access denied', data: null, message: null },
        { status: 403 }
      );
    }

    const detail = await CampaignService.getCampaignDetail(campaignId);

    return Response.json(
      { success: true, data: detail, error: null, message: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get campaign error:', error);
    return Response.json(
      { success: false, error: error.message, data: null, message: null },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/campaigns/[id] - Update campaign
 * Requires: x-user-role (Merchant), x-user-id headers
 * Only campaign owner can update
 */
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id: campaignId } = await params;
    console.log("headers", request.headers)
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

    const { owned, campaign } = await checkCampaignOwnership(campaignId, userId);

    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found', data: null, message: null },
        { status: 404 }
      );
    }

    if (!owned) {
      return Response.json(
        { success: false, error: 'Access denied', data: null, message: null },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await CampaignService.updateCampaign(campaignId, body);

    return Response.json(
      { success: true, data: updated.toObject ? updated.toObject() : updated, error: null, message: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update campaign error:', error);
    return Response.json(
      { success: false, error: error.message, data: null, message: null },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/campaigns/[id] - Delete campaign
 * Requires: x-user-role (Merchant), x-user-id headers
 * Only campaign owner can delete
 * Also deletes all associated ranges
 */
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id: campaignId } = await params;
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

    const { owned, campaign } = await checkCampaignOwnership(campaignId, userId);

    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found', data: null, message: null },
        { status: 404 }
      );
    }

    if (!owned) {
      return Response.json(
        { success: false, error: 'Access denied', data: null, message: null },
        { status: 403 }
      );
    }

    await CampaignService.deleteCampaign(campaignId);

    return Response.json(
      { success: true, data: null, message: 'Campaign deleted', error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete campaign error:', error);
    return Response.json(
      { success: false, error: error.message, data: null, message: null },
      { status: 400 }
    );
  }
}
