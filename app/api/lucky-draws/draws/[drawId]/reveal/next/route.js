import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { revealNextCategory } from '@/lib/services/luckyDraw/liveRevealService';

// Live reveal: makes the next prize public (smallest prize first) and texts its winners.
export async function POST(_request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    return ok(await revealNextCategory(merchantId, drawId));
  } catch (err) {
    return errorResponse(err);
  }
}
