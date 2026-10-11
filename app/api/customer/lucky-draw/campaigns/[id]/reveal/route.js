import { connectDB } from '@/lib/connectDB';
import { luckyDrawDisabledResponse } from '@/lib/luckyDraw/guard';
import { ok, errorResponse } from '@/lib/luckyDraw/response';
import { getPublicReveal } from '@/lib/services/luckyDraw/revealService';

// Public: the live reveal / results page polls this.
export async function GET(_request, { params }) {
  const disabled = luckyDrawDisabledResponse();
  if (disabled) return disabled;
  try {
    await connectDB();
    const { id } = await params;
    return ok(await getPublicReveal(id), 200);
  } catch (err) {
    return errorResponse(err);
  }
}
