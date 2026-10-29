import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { startLiveReveal } from '@/lib/services/luckyDraw/liveRevealService';

// Live reveal: ScratchX picks the winners from the QR entries; nothing is public yet.
export async function POST(_request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    const { draw, winners } = await startLiveReveal(merchantId, drawId);
    // The owner sees each category as it is revealed, like everyone else.
    return ok({ draw, winnerCount: winners.length });
  } catch (err) {
    return errorResponse(err);
  }
}
