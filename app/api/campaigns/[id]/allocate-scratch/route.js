import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import subscriptionValidationService from '@/lib/services/subscriptionValidationService';
import scratchEntitlementService from '@/lib/scratchEntitlementService';

export async function POST(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return Response.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const { allocationAmount } = body;

    if (!campaignId) {
      return Response.json(
        { success: false, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    if (allocationAmount === undefined || allocationAmount === null) {
      return Response.json(
        { success: false, message: 'Allocation amount is required' },
        { status: 400 }
      );
    }

    if (allocationAmount <= 0) {
      return Response.json(
        { success: false, message: 'Allocation amount must be greater than 0' },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate subscription against monthly scratch limits
    const canAllocate = await subscriptionValidationService.canAllocateScratchCards(
      userId,
      allocationAmount,
      'merchant'
    );

    if (!canAllocate.allowed) {
      return Response.json(
        {
          success: false,
          error: canAllocate.message,
          details: {
            limit: canAllocate.limit,
            available: canAllocate.available
          }
        },
        { status: 403 }
      );
    }

    // Fetch campaign
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return Response.json(
        { success: false, message: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify campaign ownership
    if (campaign.merchantId.toString() !== userId && userRole !== 'Merchant') {
      return Response.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Gate allocation on the subscription scratch entitlement.
    // Business rule: during the 90-day unlimited grant, allocation is unlimited.
    // After it expires, the merchant must have purchased scratch packs; otherwise
    // they are prompted to buy more.
    const entitlement = await scratchEntitlementService.checkEntitlement(
      userId,
      'merchant'
    );

    if (entitlement.type === 'none') {
      return Response.json(
        {
          success: false,
          error:
            'Your unlimited scratches have expired. Purchase a scratch package to allocate scratches to this campaign.',
          actionRequired: 'purchase_scratches',
          actionUrl: '/billing/scratch-packs',
        },
        { status: 403 }
      );
    }

    if (entitlement.type === 'pack') {
      // Limited by remaining balance in purchased packs.
      const packRemaining = entitlement.totalRemaining || 0;
      if (allocationAmount > packRemaining) {
        return Response.json(
          {
            success: false,
            error: `Insufficient scratches. Available: ${packRemaining}, Requested: ${allocationAmount}. Purchase more to continue.`,
            actionRequired: 'purchase_scratches',
            actionUrl: '/billing/scratch-packs',
            details: { available: packRemaining, requested: allocationAmount },
          },
          { status: 400 }
        );
      }
    }
    // entitlement.type === 'unlimited' → no balance cap during the 90-day grant.

    // Update campaign allocation
    campaign.allocated_scratch_cards = allocationAmount;
    campaign.remaining_scratch_cards =
      allocationAmount - (campaign.used_scratch_cards || 0);

    await campaign.save();

    return Response.json({
      success: true,
      message: 'Scratches allocated successfully',
      data: {
        _id: campaign._id,
        allocated_scratch_cards: campaign.allocated_scratch_cards,
        used_scratch_cards: campaign.used_scratch_cards,
        remaining_scratch_cards: campaign.remaining_scratch_cards,
      },
    });
  } catch (error) {
    console.error('Error allocating scratches:', error);
    return Response.json(
      { success: false, message: 'Failed to allocate scratches' },
      { status: 500 }
    );
  }
}
