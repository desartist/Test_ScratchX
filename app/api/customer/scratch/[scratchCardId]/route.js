import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import ScratchCardRecord from '@/models/scratchCardRecordModel';
import CustomerParticipation from '@/models/customerParticipationModel';
import { isExpired } from '@/lib/services/expiryManagementService';

/**
 * GET /api/customer/scratch/:scratchCardId
 * Fetch scratch card details (without revealing reward until revealed)
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { scratchCardId } = await params;

    // Validation: Required field
    if (!scratchCardId) {
      return NextResponse.json(
        { success: false, error: 'scratchCardId is required', data: null },
        { status: 400 }
      );
    }

    // Fetch scratch card
    const scratchCard = await ScratchCardRecord.findById(scratchCardId).lean();
    if (!scratchCard) {
      return NextResponse.json(
        { success: false, error: 'Scratch card not found', data: null },
        { status: 404 }
      );
    }

    // Check if expired
    const expired = isExpired(scratchCard);

    // Fetch participation for additional context
    const participation = await CustomerParticipation.findById(
      scratchCard.customer_participation_id
    ).lean();

    // Format response
    const response = {
      scratchCardId: scratchCard._id.toString(),
      status: expired ? 'expired' : scratchCard.status,
      expiresAt: scratchCard.expires_at,
      generatedAt: scratchCard.generated_at,
      // Only include reward details if card is revealed
      ...(scratchCard.status !== 'generated' && {
        rewardType: scratchCard.reward_type,
        rewardValue: scratchCard.reward_value,
        rewardDescription: scratchCard.reward_description,
      }),
      // Include participation reference
      participationId: participation?._id?.toString(),
    };

    return NextResponse.json(
      { success: true, data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching scratch card:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error', data: null },
      { status: 500 }
    );
  }
}
