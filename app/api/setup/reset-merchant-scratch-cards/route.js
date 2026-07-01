import { connectDB } from '@/lib/connectDB';
import account from '@/models/accountModel';

/**
 * This is a setup endpoint to initialize scratches for merchant accounts
 * In production, this should be protected and only accessible to admins
 *
 * Usage: POST /api/setup/reset-merchant-scratch-cards
 * Body: {
 *   totalScratchCards: 10000 (optional, defaults to 10000)
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const totalScratchCards = body.totalScratchCards || 10000;

    await connectDB();

    // Update all Merchant accounts to have scratch tracking
    const result = await account.updateMany(
      { role: 'Merchant' },
      {
        $set: {
          scratchCards: {
            total_scratch_cards: totalScratchCards,
            used_scratch_cards: 0,
            allocated_scratch_cards: 0,
            redeemed_scratch_cards: 0,
          },
        },
      }
    );

    return Response.json({
      success: true,
      message: `Updated ${result.modifiedCount} merchant accounts with scratch initialization`,
      data: {
        modifiedCount: result.modifiedCount,
        totalScratchCards: totalScratchCards,
      },
    });
  } catch (error) {
    console.error('Error resetting merchant scratches:', error);
    return Response.json(
      { success: false, message: 'Failed to reset merchant scratches' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to view current scratch status of all merchants
 */
export async function GET(request) {
  try {
    await connectDB();

    const merchants = await account
      .find({ role: 'Merchant' })
      .select('name email scratchCards');

    return Response.json({
      success: true,
      data: merchants,
    });
  } catch (error) {
    console.error('Error fetching merchant scratches:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch merchant scratches' },
      { status: 500 }
    );
  }
}
