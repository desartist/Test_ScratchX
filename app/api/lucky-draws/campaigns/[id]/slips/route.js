import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { setSlipCount } from '@/lib/services/luckyDraw/slipDrawService';

// Slip draws: how many numbered slips have been handed out so far.
export async function PATCH(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { id } = await params;
    const { slipCount } = await readJson(request);
    return ok(await setSlipCount(merchantId, id, slipCount));
  } catch (err) {
    return errorResponse(err);
  }
}
