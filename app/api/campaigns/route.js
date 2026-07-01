import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import Subscription from '@/models/subscriptionModel';
import CampaignService from '@/lib/campaignService';

async function checkMerchantSubscription(userId) {
  const sub = await Subscription.findOne({
    ownerId: userId,
    ownerType: 'merchant',
    status: { $in: ['trial', 'active', 'past_due'] },
  }).lean();
  return Boolean(sub);
}

const SUBSCRIPTION_REQUIRED_RESPONSE = Response.json(
  { success: false, code: 'SUBSCRIPTION_REQUIRED', error: 'Please activate a subscription plan.', data: null },
  { status: 402 }
);

/**
 * POST /api/campaigns - Create a new campaign
 * Requires: x-user-role (Merchant), x-user-id headers
 */
export async function POST(request) {
  try {
    await connectDB();

    // Check authorization
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
        { success: false, error: 'Only merchants can create campaigns', data: null, message: null },
        { status: 403 }
      );
    }

    if (!(await checkMerchantSubscription(userId))) {
      return SUBSCRIPTION_REQUIRED_RESPONSE;
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'campaignType', 'startDate', 'endDate', 'totalQRCodes'];
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

    // Create campaign using service
    const campaign = await CampaignService.createCampaign(userId, {
      name: body.name,
      description: body.description,
      campaignType: body.campaignType,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      totalQRCodes: body.totalQRCodes,
      discountPercentage: body.discountPercentage
    });

    return Response.json(
      { success: true, data: campaign.toObject ? campaign.toObject() : campaign, error: null, message: null },
      { status: 201 }
    );
  } catch (error) {
    console.error('Campaign creation error:', error);
    return Response.json(
      { success: false, error: error.message, data: null, message: null },
      { status: 400 }
    );
  }
}

/**
 * GET /api/campaigns - List campaigns for authenticated merchant
 * Supports filtering by: status, type
 * Requires: x-user-role (Merchant), x-user-id headers
 */
export async function GET(request) {
  try {
    await connectDB();

    // Check authorization
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
        { success: false, error: 'Only merchants can view campaigns', data: null, message: null },
        { status: 403 }
      );
    }

    if (!(await checkMerchantSubscription(userId))) {
      return SUBSCRIPTION_REQUIRED_RESPONSE;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const campaignType = searchParams.get('type');

    const filters = {};
    if (status) filters.status = status;
    if (campaignType) filters.campaignType = campaignType;

    // Get campaigns using service
    const campaigns = await CampaignService.getCampaigns(userId, filters);

    return Response.json(
      { success: true, data: campaigns, error: null, message: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get campaigns error:', error);
    return Response.json(
      { success: false, error: error.message, data: null, message: null },
      { status: 400 }
    );
  }
}
