import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import { requireAuth } from '@/lib/auth';
import Subscription from '@/models/subscriptionModel';
import platformAccessService from '@/lib/services/platformAccessService';

/**
 * GET /api/subscription/eligibility
 *
 * Checks if a user can create campaigns based on:
 * 1. Whether they have an active plan
 * 2. Whether they have scratches available (unlimited or purchased)
 *
 * Response format:
 * - User with no plan: { canCreateCampaign: false, reason: "...", planRequired: true }
 * - User with unlimited scratches: { canCreateCampaign: true, scratchesType: "UNLIMITED", daysRemaining: X }
 * - User with purchased scratches: { canCreateCampaign: true, scratchesType: "PURCHASED", scratchRemaining: X }
 * - User with no scratches: { canCreateCampaign: false, reason: "...", scratchesType: "NONE", ctaText: "Purchase Scratches" }
 */
export async function GET(request) {
  try {
    // Connect to database
    await connectDB();

    // Authenticate user
    const { account, error: authError } = await requireAuth();
    if (authError) {
      return authError;
    }

    // Check if user can create campaigns using platformAccessService
    const canCreateCheck = await platformAccessService.canCreateCampaign(account._id);

    if (!canCreateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          canCreateCampaign: false,
          reason: canCreateCheck.reason,
          planRequired: true,
        },
        { status: 200 }
      );
    }

    // User has a plan, now check subscription status
    const subscription = await Subscription.findOne({
      ownerId: account._id,
      ownerType: { $in: ['merchant', 'distributor'] },
      status: { $in: ['trial', 'active', 'past_due'] },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          canCreateCampaign: false,
          reason: 'No active subscription found',
          planRequired: true,
        },
        { status: 200 }
      );
    }

    const now = new Date();

    // Check for unlimited scratches (quarterly allowance)
    if (
      subscription.unlimitedScratches?.isActive &&
      subscription.unlimitedScratches?.validUntil &&
      subscription.unlimitedScratches.validUntil > now
    ) {
      const daysRemaining = Math.ceil(
        (subscription.unlimitedScratches.validUntil - now) / (1000 * 60 * 60 * 24)
      );

      return NextResponse.json(
        {
          success: true,
          canCreateCampaign: true,
          scratchesType: 'UNLIMITED',
          daysRemaining,
          validUntil: subscription.unlimitedScratches.validUntil,
        },
        { status: 200 }
      );
    }

    // Check for purchased scratches (scratch packs)
    if (subscription.scratchPacks && subscription.scratchPacks.length > 0) {
      const activePacks = subscription.scratchPacks.filter(
        (pack) => pack.remaining > 0
      );

      if (activePacks.length > 0) {
        const totalRemaining = activePacks.reduce(
          (sum, pack) => sum + pack.remaining,
          0
        );

        return NextResponse.json(
          {
            success: true,
            canCreateCampaign: true,
            scratchesType: 'PURCHASED',
            scratchRemaining: totalRemaining,
            packs: activePacks.map((pack) => ({
              quantity: pack.quantity,
              consumed: pack.consumed,
              remaining: pack.remaining,
              purchasedAt: pack.purchasedAt,
            })),
          },
          { status: 200 }
        );
      }
    }

    // No scratches available
    return NextResponse.json(
      {
        success: false,
        canCreateCampaign: false,
        reason:
          'Your Unlimited Scratches period has ended. Please purchase a scratch pack to continue creating campaigns.',
        scratchesType: 'NONE',
        ctaText: 'Purchase Scratches',
        ctaUrl: '/billing/scratch-packs',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/subscription/eligibility] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
