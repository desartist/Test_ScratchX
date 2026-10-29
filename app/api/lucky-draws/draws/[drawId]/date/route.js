import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { changeDrawDate } from '@/lib/services/luckyDraw/drawDateService';

export async function PATCH(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { drawId } = await params;
    const { drawDate, reason, notifyEntrants } = await readJson(request);
    return ok(
      await changeDrawDate(drawId, {
        merchantId,
        newDate: drawDate,
        reason,
        // Explicit opt-in at the API level; the UI checkbox defaults to checked.
        notifyEntrants: notifyEntrants === true,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
