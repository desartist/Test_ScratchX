import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import CustomerParticipation from '@/models/customerParticipationModel';
import ScratchCardRecord from '@/models/scratchCardRecordModel';
import { redeemInventory } from '@/lib/services/inventoryManagementService';
import { isExpired } from '@/lib/services/expiryManagementService';

/**
 * POST /api/customer/scratch/redeem
 * Redeem the coupon (must be revealed, not expired)
 * Request body: { scratchCardId, participationId }
 * NOTE: MongoDB transactions removed for standalone development instances
 */
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { scratchCardId } = body;

    // Validation: Required fields
    if (!scratchCardId) {
      return NextResponse.json(
        { success: false, error: 'scratchCardId is required', data: null },
        { status: 400 }
      );
    }

    // Fetch scratch card (without session/transaction)
    const scratchCard = await ScratchCardRecord.findById(scratchCardId);
    if (!scratchCard) {
      return NextResponse.json(
        { success: false, error: 'Scratch card not found', data: null },
        { status: 404 }
      );
    }

    // Fetch participation
    const participation = await CustomerParticipation.findById(scratchCard.customer_participation_id);
    if (!participation) {
      return NextResponse.json(
        { success: false, error: 'Participation record not found', data: null },
        { status: 404 }
      );
    }

    // Validation: Check NOT expired
    if (isExpired(scratchCard)) {
      return NextResponse.json(
        { success: false, error: 'Scratch card has expired and cannot be redeemed', data: null },
        { status: 400 }
      );
    }

    // Validation: Check status = revealed
    if (scratchCard.status !== 'revealed') {
      return NextResponse.json(
        { success: false, error: `Scratch card must be in 'revealed' status to redeem. Current status: ${scratchCard.status}`, data: null },
        { status: 400 }
      );
    }

    // Fetch campaign for inventory update
    const campaign = await Campaign.findById(participation.campaign_id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found', data: null },
        { status: 404 }
      );
    }

    // Call redeemInventory for inventory updates
    const inventoryResult = await redeemInventory(
      participation.campaign_id.toString(),
      participation.merchant_id.toString(),
      participation.merchant_id.toString(),
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    if (!inventoryResult.success) {
      return NextResponse.json(
        { success: false, error: inventoryResult.error, data: null },
        { status: 400 }
      );
    }

    // Update scratch card status to redeemed
    scratchCard.status = 'redeemed';
    scratchCard.redeemed_at = new Date();
    await scratchCard.save();

    // Update participation status to redeemed
    participation.status = 'redeemed';
    participation.redeemed_at = new Date();
    await participation.save();

    // Format response
    const response = {
      scratchCardId: scratchCard._id.toString(),
      message: 'Reward redeemed successfully',
      redeemTime: scratchCard.redeemed_at
    };

    return NextResponse.json(
      { success: true, data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error redeeming scratch card:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body', data: null },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
