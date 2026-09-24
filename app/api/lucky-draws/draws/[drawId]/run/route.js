import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { assertDrawOwner } from '@/lib/services/luckyDraw/openDraw';
import { runDraw } from '@/lib/services/luckyDraw/drawService';

export async function POST(_request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    await assertDrawOwner(drawId, merchantId);
    return ok(await runDraw(drawId, { source: 'manual', accountId: merchantId }));
  } catch (err) {
    return errorResponse(err);
  }
}
