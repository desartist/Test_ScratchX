import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { markWinnerClaimed } from '@/lib/services/luckyDraw/claimService';

// The store owner marks a prize as collected from the winners list.
export async function PATCH(request, { params }) {
  try {
    const { error, merchantId, account } = await requireMerchant();
    if (error) return error;
    const { winnerId } = await params;
    const { storeId } = await readJson(request);
    return ok(await markWinnerClaimed(merchantId, winnerId, { account, storeId }));
  } catch (err) {
    return errorResponse(err);
  }
}
