import { connectDB } from '@/lib/connectDB';
import { luckyDrawDisabledResponse } from '@/lib/luckyDraw/guard';
import { ok, errorResponse } from '@/lib/luckyDraw/response';
import { getPublicReveal } from '@/lib/services/luckyDraw/revealService';

// Public: the live reveal / results page polls this. ?slip=457 checks one slip.
export async function GET(request, { params }) {
  const disabled = luckyDrawDisabledResponse();
  if (disabled) return disabled;
  try {
    await connectDB();
    const { id } = await params;
    const slip = new URL(request.url).searchParams.get('slip');
    return ok(await getPublicReveal(id, { slipNumber: slip }), 200);
  } catch (err) {
    return errorResponse(err);
  }
}
