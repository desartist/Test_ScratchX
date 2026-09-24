import { connectDB } from '@/lib/connectDB';
import { luckyDrawDisabledResponse } from '@/lib/luckyDraw/guard';
import { ok, errorResponse, readJson } from '@/lib/luckyDraw/response';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';
import { getPublicCampaign } from '@/lib/services/luckyDraw/publicService';
import { createEntry, shouldSendConfirmation } from '@/lib/services/luckyDraw/entryService';
import { sendSms, messages } from '@/lib/services/luckyDraw/notifier';

// Public: no session. Abuse limits live in createEntry (duplicate guard, entry cap, geofence)
// and in shouldSendConfirmation (at most one confirmation SMS per number per 10 minutes).
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
      skipLocationCheck: !campaign.requiresLocation,
    });

    let confirmationSent = false;
    if (await shouldSendConfirmation({ drawId: result.drawId, customerPhone: body.customerMobile })) {
      try {
        await sendSms(
          body.customerMobile,
          messages.entryConfirmation({
            campaignName: result.campaignName,
            entries: result.entriesGranted,
            drawDate: result.drawDate,
          }),
        );
        confirmationSent = true;
      } catch (smsError) {
        console.error('[LuckyDraw] confirmation SMS failed', smsError.message);
      }
    }

    return ok(
      {
        entriesGranted: result.entriesGranted,
        totalEntries: result.totalEntries,
        capped: result.capped,
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
