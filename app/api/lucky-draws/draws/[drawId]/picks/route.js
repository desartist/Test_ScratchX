import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { saveWinnerPicks } from '@/lib/services/luckyDraw/pickService';

/** The owner saves the winners of a Physical draw held in the shop. */
export async function POST(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    const { picks } = await readJson(request);
    return ok(await saveWinnerPicks(merchantId, drawId, picks));
  } catch (err) {
    return errorResponse(err);
  }
}
