import { connectDB } from '@/lib/connectDB';
import account from '@/models/accountModel';

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

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
