import { connectDB } from '@/lib/connectDB';
import { luckyDrawDisabledResponse } from '@/lib/luckyDraw/guard';
import { ok, errorResponse, readJson } from '@/lib/luckyDraw/response';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';
import { getPublicCampaign } from '@/lib/services/luckyDraw/publicService';
import { createEntry, sendEntryConfirmation } from '@/lib/services/luckyDraw/entryService';

// Public: no session. Abuse limits live in createEntry (duplicate guard, geofence, minimum bill)
// and in sendEntryConfirmation (at most one confirmation SMS per number per 10 minutes).
export async function POST(request) {
  const disabled = luckyDrawDisabledResponse();
  if (disabled) return disabled;
  try {
    await connectDB();
    const body = await readJson(request);
    const campaign = await getPublicCampaign(body.campaignId);

    const result = await createEntry({
      campaignId: body.campaignId,
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      billAmount: body.billAmount,
      consent: body.consent,
      latitude: body.latitude,
      longitude: body.longitude,
      source: 'qr',
      skipLocationCheck: !campaign.requiresLocation,
    });

    const confirmationSent = await sendEntryConfirmation({
      drawId: result.drawId,
      customerPhone: body.customerMobile,
      campaignName: result.campaignName,
      drawDate: result.drawDate,
    });

    return ok(
      {
        entryNumber: result.entryNumber,
        entriesGranted: result.entriesGranted,
        totalEntries: result.totalEntries,
        drawDate: result.drawDate,
        campaignName: result.campaignName,
        notice: DATE_CHANGE_NOTICE,
        confirmationSent,
      },
      201,
    );
  } catch (err) {
    return errorResponse(err);
  }
}
