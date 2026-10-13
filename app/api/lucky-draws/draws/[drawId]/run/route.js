import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { runOwnerDraw } from '@/lib/services/luckyDraw/drawService';

export async function POST(_request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    return ok(await runOwnerDraw(merchantId, drawId));
  } catch (err) {
    return errorResponse(err);
  }
}
