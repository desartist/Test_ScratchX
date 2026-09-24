import { connectDB } from '@/lib/connectDB';
import { luckyDrawDisabledResponse } from '@/lib/luckyDraw/guard';
import { ok, errorResponse } from '@/lib/luckyDraw/response';
import { getPublicCampaign } from '@/lib/services/luckyDraw/publicService';

// Public: customers scan a QR and land here with no session.
export async function GET(_request, { params }) {
  const disabled = luckyDrawDisabledResponse();
  if (disabled) return disabled;
  try {
    await connectDB();
    const { id } = await params;
    return ok(await getPublicCampaign(id));
  } catch (err) {
    return errorResponse(err);
  }
}
