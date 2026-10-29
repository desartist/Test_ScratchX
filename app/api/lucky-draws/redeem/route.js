import { ok, errorResponse, readJson, requireRedeemer } from '@/lib/luckyDraw/http';
import { redeemClaimCode } from '@/lib/services/luckyDraw/redemptionService';

export async function POST(request) {
  try {
    const { error, account } = await requireRedeemer();
    if (error) return error;
    const { claimCode, storeId } = await readJson(request);
    return ok(await redeemClaimCode({ claimCode, account, storeId: storeId || null }));
  } catch (err) {
    return errorResponse(err);
  }
}
