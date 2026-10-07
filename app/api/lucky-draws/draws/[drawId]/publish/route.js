import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { publishManualWinners } from '@/lib/services/luckyDraw/slipDrawService';

// In-store reveal: publishes the typed-in winning slips.
export async function POST(_request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    return ok(await publishManualWinners(merchantId, drawId));
  } catch (err) {
    return errorResponse(err);
  }
}
