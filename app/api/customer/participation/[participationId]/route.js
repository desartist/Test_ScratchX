import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import rangeModel from '@/models/rangeModel';

/**
 * GET /api/customer/participation/[participationId]
 *
 * Fetch participation details with reward information
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     participationId: string,
 *     customerId: string,
 *     campaign: { _id, campaignName, ...},
 *     store: { _id, storeName, city, state, ... },
 *     reward: {
 *       rewardId: string,
 *       rewardName: string,
 *       couponCode: string,
 *       description: string,
 *       expiryDate: Date,
 *       value: number,
 *       type: string
 *     },
 *     billingRange: { _id, min, max, ... },
 *     participatedAt: Date,
 *     createdAt: Date
 *   }
 * }
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { participationId } = await params;

    if (!participationId) {
      return NextResponse.json(
        { success: false, error: 'Participation ID is required' },
        { status: 400 }
      );
    }

    // Dynamically import models to avoid circular dependencies
    const { default: CustomerParticipation } = await import('@/models/customerParticipationModel');
    const { default: Campaign } = await import('@/models/campaignModel');
    const { default: Store } = await import('@/models/storeModel');
    const { default: ScratchCardRecord } = await import('@/models/scratchCardRecordModel');

    // Fetch participation record with populated references
    const participation = await CustomerParticipation.findById(participationId)
      .populate({
        path: 'campaign_id',
        select: '_id name campaignName status startDate endDate scratchTotal'
      })
      .populate({
        path: 'store_id',
        select: '_id store_name city state address pincode latitude longitude'
      })
      .populate({
        path: 'range_id',
        select: '_id min max rewards'
      })
      .lean();

    if (!participation) {
      return NextResponse.json(
        { success: false, error: 'Participation record not found' },
        { status: 404 }
      );
    }

    // Only enforce 5-min expiry for sessions in "verified" status that haven't been revealed yet
    // Revealed/redeemed sessions should always be accessible
    if (participation.status === 'verified') {
      const createdAt = new Date(participation.createdAt);
      const ageInSeconds = (Date.now() - createdAt.getTime()) / 1000;
      // 5-minute (300 second) window to reveal the reward
      if (ageInSeconds > 300) {
        console.log(`[Participation Expiry] Status: ${participation.status}, Age: ${ageInSeconds}s, Expired: true`);
        return NextResponse.json(
          { success: false, error: 'Reward session has expired', expired: true },
          { status: 410 }
        );
      }
    } else if (participation.status === 'revealed' || participation.status === 'redeemed') {
      // Already revealed/redeemed sessions have a longer expiry - allow indefinite access
      // User can show coupon to cashier for a reasonable period (no hard expiry on access)
      console.log(`[Participation Status] Status: ${participation.status}, allowing access`);
    }

    // Fetch the ScratchCardRecord which holds the actual assigned reward
    const scratchCard = participation.scratch_card_id
      ? await ScratchCardRecord.findById(participation.scratch_card_id).lean()
      : null;
    const billingRange = participation.range_id
      ? await rangeModel.findById(participation.range_id).lean()
      : null;
    console.log("[GET billingRange] billingRange:", billingRange);
    function buildRewardName(type, value) {
      switch (type) {
        case 'discount': return value ? `₹${value} OFF` : 'Discount';
        case 'cashback': return value ? `${value}% OFF` : 'Cashback';
        case 'freeItem': return 'Free Gift';
        case 'voucher':  return value ? `₹${value} Voucher` : 'Voucher';
        default:         return value ? `₹${value} OFF` : 'Special Reward';
      }
    }

    const reward = scratchCard ? {
      rewardId:   scratchCard._id.toString(),
      rewardName: buildRewardName(scratchCard.reward_type, scratchCard.reward_value),
      couponCode: scratchCard.coupon_code || '',
      description: scratchCard.reward_description || '',
      expiryDate:  scratchCard.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      value: scratchCard.reward_value,
      type:  scratchCard.reward_type,  // 'discount' | 'cashback' | 'freeItem' | 'voucher'
      image: scratchCard.reward_image || null,
    } : null;

    // Format response
    const formattedParticipation = {
      participationId: participation._id.toString(),
      status: participation.status,
      scratchCardId: scratchCard ? scratchCard._id.toString() : null,
      rewardClaimExpiresAt: participation.reward_claim_expires_at || null,
      participantName: participation.participant_name,
      participantPhone: participation.participant_phone,
      campaign: participation.campaign_id ? {
        _id: participation.campaign_id._id.toString(),
        campaignName: participation.campaign_id.campaignName || participation.campaign_id.name,
        status: participation.campaign_id.status,
        startDate: participation.campaign_id.startDate,
        endDate: participation.campaign_id.endDate
      } : null,
      store: participation.store_id ? {
        _id: participation.store_id._id.toString(),
        storeName: participation.store_id.store_name,
        city: participation.store_id.city,
        state: participation.store_id.state,
        address: participation.store_id.address,
        pincode: participation.store_id.pincode,
        latitude: participation.store_id.latitude,
        longitude: participation.store_id.longitude
      } : null,
      reward: reward,
      billingRange: billingRange ? {
        _id: billingRange._id.toString(),
        min: billingRange.minAmount,
        max: billingRange.maxAmount
      } : null,
      participatedAt: participation.participatedAt || participation.createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        data: formattedParticipation
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching participation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch participation details'
      },
      { status: 500 }
    );
  }
}
