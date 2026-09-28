import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import subscriptionValidationService from '@/lib/services/subscriptionValidationService';
import scratchEntitlementService from '@/lib/scratchEntitlementService';
import { requireAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account, error: authError } = await requireAuth();
    if (authError) return authError;
    const userRole = account.role;
    const userId = account._id.toString();


    if (!userId) {
      return Response.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const { allocationAmount, targetTotal } = body;

    if (!campaignId) {
      return Response.json(
        { success: false, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Two modes:
    //   • { allocationAmount } — ADD that many to the existing allocation.
    //     The default; the launch wizard and other callers rely on it.
    //   • { targetTotal }      — SET the campaign's allocation to exactly this
    //     total (the Allocate Scratches popup on the campaign page). May be
    //     lower than today's allocation, but never below what's been used.
    const isSetMode = targetTotal !== undefined && targetTotal !== null;
    const requested = isSetMode ? targetTotal : allocationAmount;

    if (requested === undefined || requested === null) {
      return Response.json(
        { success: false, message: 'Allocation amount is required' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(requested) || requested <= 0) {
      return Response.json(
        { success: false, message: 'Allocation amount must be greater than 0' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch campaign
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return Response.json(
        { success: false, message: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify campaign ownership
    // Owner, or an Admin acting on their behalf. (This previously read
    // `userRole !== 'Merchant'`, which for a merchant caller is always
    // false — so the deny never fired and any merchant could act on any
    // campaign.)
    if (campaign.merchantId.toString() !== userId && userRole !== 'Admin') {
      return Response.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const previousAllocation = campaign.allocated_scratch_cards || 0;
    // used and redeemed are separate buckets (campaignModel pre-validate:
    // remaining = allocated − used − redeemed, and used + redeemed may not
    // exceed allocated). Both have been consumed and can't be taken back, so
    // the floor is their sum — flooring at `used` alone let a total through
    // that then failed model validation on save as a generic 500.
    const used = (campaign.used_scratch_cards || 0) + (campaign.redeemed_scratch_cards || 0);

    // In set mode the requested value is the new total, so the amount being
    // added is the difference — which can be zero or negative (a reduction).
    const newTotal = isSetMode ? requested : previousAllocation + requested;
    const amountToAdd = newTotal - previousAllocation;

    // Scratches customers have already used can't be taken back.
    if (newTotal < used) {
      return Response.json(
        {
          success: false,
          error: `${used.toLocaleString()} scratches have already been used on this campaign, so the allocation can't go below ${used.toLocaleString()}.`,
          details: { used, requested: newTotal },
        },
        { status: 400 }
      );
    }

    if (amountToAdd === 0) {
      return Response.json({
        success: true,
        message: 'Allocation unchanged',
        data: {
          _id: campaign._id,
          allocated_scratch_cards: previousAllocation,
          used_scratch_cards: used,
          remaining_scratch_cards: campaign.remaining_scratch_cards,
          previous_allocation: previousAllocation,
          added: 0,
        },
      });
    }

    // Plan limits and scratch balance only gate an INCREASE. Allocation is a
    // per-campaign cap — the merchant's pack balance is only debited when a
    // customer actually scans (scratchEntitlementService.consumeScratch) — so
    // lowering it never needs a balance, and a merchant whose grant has
    // expired can still trim an existing campaign.
    if (amountToAdd > 0) {
      // Validate subscription against monthly scratch limits
      const canAllocate = await subscriptionValidationService.canAllocateScratchCards(
        userId,
        amountToAdd,
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

      // Gate allocation on the subscription scratch entitlement.
      // Business rule: during the 365-day unlimited grant, allocation is unlimited.
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
        if (amountToAdd > packRemaining) {
          return Response.json(
            {
              success: false,
              error: `Insufficient scratches. Available: ${packRemaining}, Requested: ${amountToAdd}. Purchase more to continue.`,
              actionRequired: 'purchase_scratches',
              actionUrl: '/billing/scratch-packs',
              details: { available: packRemaining, requested: amountToAdd },
            },
            { status: 400 }
          );
        }
      }
      // entitlement.type === 'unlimited' → no balance cap during the 365-day grant.
    }

    campaign.allocated_scratch_cards = newTotal;
    campaign.remaining_scratch_cards = newTotal - used;

    await campaign.save();

    return Response.json({
      success: true,
      message: 'Scratches allocated successfully',
      data: {
        _id: campaign._id,
        allocated_scratch_cards: campaign.allocated_scratch_cards,
        used_scratch_cards: campaign.used_scratch_cards,
        remaining_scratch_cards: campaign.remaining_scratch_cards,
        previous_allocation: previousAllocation,
        // Negative when set mode lowered the allocation.
        added: amountToAdd,
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
