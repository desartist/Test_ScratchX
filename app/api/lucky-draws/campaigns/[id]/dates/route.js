import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { extendDates } from '@/lib/services/luckyDraw/dateExtensionService';

// Gives customers more time: entries close later, or winners are revealed later.
export async function PATCH(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { id } = await params;
    const { target, newDate, reason, notifyEntrants } = await readJson(request);
    return ok(await extendDates(id, { merchantId, target, newDate, reason, notifyEntrants: notifyEntrants === true }));
  } catch (err) {
    return errorResponse(err);
  }
}
