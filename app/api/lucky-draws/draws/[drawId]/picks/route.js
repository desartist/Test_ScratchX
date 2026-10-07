import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { saveManualPicks } from '@/lib/services/luckyDraw/slipDrawService';

// In-store reveal: saves the winning slips typed in so far (not public until published).
export async function PUT(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    const { picks } = await readJson(request);
    return ok(await saveManualPicks(merchantId, drawId, picks));
  } catch (err) {
    return errorResponse(err);
  }
}
