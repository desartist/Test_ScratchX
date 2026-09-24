import { connectDB } from '@/lib/connectDB';
import { luckyDrawDisabledResponse } from '@/lib/luckyDraw/guard';
import { ok, errorResponse, readJson } from '@/lib/luckyDraw/response';
import { getEntryStatus } from '@/lib/services/luckyDraw/entryService';

// POST (not GET) so the phone number never appears in a URL or access log.
// The result never includes claim codes; winners receive theirs by SMS only.
export async function POST(request) {
  const disabled = luckyDrawDisabledResponse();
  if (disabled) return disabled;
  try {
    await connectDB();
    const { campaignId, customerMobile } = await readJson(request);
    return ok(await getEntryStatus({ campaignId, customerMobile }));
  } catch (err) {
    return errorResponse(err);
  }
}
