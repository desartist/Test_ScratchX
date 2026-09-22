import { connectDB } from '@/lib/connectDB';
import account from '@/models/accountModel';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    // Identity comes from the signed session cookie, never from
    // client-supplied x-user-* headers (those are trivially forged).
    const { account: authAccount, error: authError } = await requireAuth();
    if (authError) return authError;
    const userId = authAccount._id.toString();

    if (!userId) {
      return Response.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Fetch merchant by userId
    const merchant = await account.findById(userId);

    if (!merchant) {
      return Response.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    const scratchCards = merchant.scratchCards || {};
    const totalCards = scratchCards.total_scratch_cards || 0;
    const usedCards = scratchCards.used_scratch_cards || 0;

    return Response.json({
      success: true,
      data: {
        total_scratch_cards: totalCards,
        used_scratch_cards: usedCards,
        remaining_scratch_cards: totalCards - usedCards,
      },
    });
  } catch (error) {
    console.error('Error fetching merchant scratch info:', error);
    return Response.json(
      { success: false, message: 'Failed to fetch merchant information' },
      { status: 500 }
    );
  }
}
