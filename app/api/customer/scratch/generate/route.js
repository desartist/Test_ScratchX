import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import Campaign from '@/models/campaignModel';
import Range from '@/models/rangeModel';
import CustomerParticipation from '@/models/customerParticipationModel';
import ScratchCardRecord from '@/models/scratchCardRecordModel';
import { scheduleExpiry } from '@/lib/services/expiryManagementService';

/**
 * POST /api/customer/scratch/generate
 * Generate scratch card for customer
 * Request body: { participationId }
 */
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { participationId, campaignId } = body;

    // Validation: Required fields
    if (!participationId) {
      return NextResponse.json(
        { success: false, error: 'participationId is required', data: null },
        { status: 400 }
      );
    }

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaignId is required', data: null },
        { status: 400 }
      );
    }

    // Fetch customer participation
    const participation = await CustomerParticipation.findById(participationId);
    if (!participation) {
      return NextResponse.json(
        { success: false, error: 'Participation record not found', data: null },
        { status: 404 }
      );
    }

    // Validation: Participation must be in verified status
    if (participation.status !== 'verified') {
      return NextResponse.json(
        { success: false, error: `Cannot generate scratch card for participation in ${participation.status} status. Must be 'verified'.`, data: null },
        { status: 400 }
      );
    }

    // Fetch scratch card
    const scratchCard = await ScratchCardRecord.findById(participation.scratch_card_id);
    if (!scratchCard) {
      return NextResponse.json(
        { success: false, error: 'Scratch card not found', data: null },
        { status: 404 }
      );
    }

    // Fetch campaign and range to get rewards
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found', data: null },
        { status: 404 }
      );
    }

    const range = await Range.findById(participation.range_id);
    if (!range || !range.rewards || range.rewards.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rewards available for this range', data: null },
        { status: 400 }
      );
    }

    // Select a random reward from the range
    const randomRewardRaw = range.rewards[Math.floor(Math.random() * range.rewards.length)];

    // Map reward type to valid enum: 'discount', 'freeItem', 'cashback', 'voucher'
    const mapRewardType = (type) => {
      const typeMap = {
        'Fixed Amount': 'discount',
        'Percentage': 'cashback',
        'Gift': 'freeItem'
      };
      return typeMap[type] || 'discount';
    };

    // Map reward fields from range format to ScratchCardRecord format
    // Range format: { type: 'Fixed Amount'|'Percentage'|'Gift', value, description }
    // ScratchCardRecord format: { reward_type, reward_value, reward_description }
    const randomReward = {
      reward_type: mapRewardType(randomRewardRaw.type),
      reward_value: parseFloat(randomRewardRaw.value) || 0,
      reward_description: randomRewardRaw.description || `${randomRewardRaw.type}: ${randomRewardRaw.value}`
    };

    // Update scratch card with reward details
    scratchCard.reward_type = randomReward.reward_type;
    scratchCard.reward_value = randomReward.reward_value;
    scratchCard.reward_description = randomReward.reward_description;
    scratchCard.status = 'generated';
    scratchCard.generated_at = new Date();
    await scratchCard.save();

    // Schedule expiry for the scratch card (5 minutes)
    const expiryResult = await scheduleExpiry(scratchCard._id.toString(), 5);
    if (!expiryResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to schedule expiry: ' + expiryResult.error, data: null },
        { status: 500 }
      );
    }

    // Update participation status to 'scratched'
    participation.status = 'scratched';
    participation.generated_at = new Date();
    await participation.save();

    // Format response - do NOT reveal the reward
    const response = {
      scratchCardId: scratchCard._id.toString(),
      expiresAt: expiryResult.expiresAt,
      expiryMinutes: expiryResult.expiryMinutes
    };

    return NextResponse.json(
      { success: true, data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating scratch card:', error);

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
