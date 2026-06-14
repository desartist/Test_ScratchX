import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/connectDB';
import CustomerParticipation from '@/models/customerParticipationModel';
import ScratchCardRecord from '@/models/scratchCardRecordModel';
import { isExpired } from '@/lib/services/expiryManagementService';

/**
 * POST /api/customer/scratch/reveal
 * Mark scratch card as revealed (revealed by customer)
 * Request body: { scratchCardId, participationId }
 */
export async function POST(request) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectDB();

    const body = await request.json();
    const { scratchCardId } = body;

    // Validation: Required fields
    if (!scratchCardId) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'scratchCardId is required', data: null },
        { status: 400 }
      );
    }

    // Fetch scratch card
    const scratchCard = await ScratchCardRecord.findById(scratchCardId).session(session);
    if (!scratchCard) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'Scratch card not found', data: null },
        { status: 404 }
      );
    }

    // Validation: Scratch card must be in generated status (not already revealed)
    if (scratchCard.status !== 'generated') {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: `Cannot reveal scratch card in ${scratchCard.status} status. Must be 'generated'.`, data: null },
        { status: 400 }
      );
    }

    // Validation: Check if not expired
    if (isExpired(scratchCard)) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'Scratch card has expired', data: null },
        { status: 400 }
      );
    }

    // Fetch participation for reference
    const participation = await CustomerParticipation.findById(scratchCard.customer_participation_id).session(session);
    if (!participation) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'Participation record not found', data: null },
        { status: 404 }
      );
    }

    // Update scratch card status to revealed
    scratchCard.status = 'revealed';
    scratchCard.revealed_at = new Date();
    await scratchCard.save({ session });

    // Update participation status to revealed
    participation.status = 'revealed';
    participation.revealed_at = new Date();
    await participation.save({ session });

    await session.commitTransaction();

    // Format response
    const response = {
      scratchCardId: scratchCard._id.toString(),
      rewardType: scratchCard.reward_type,
      rewardValue: scratchCard.reward_value,
      rewardDescription: scratchCard.reward_description,
      expiresAt: scratchCard.expires_at
    };

    return NextResponse.json(
      { success: true, data: response },
      { status: 200 }
    );
  } catch (error) {
    await session.abortTransaction();
    console.error('Error revealing scratch card:', error);

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
  } finally {
    await session.endSession();
  }
}
