import { ok, errorResponse, readJson, requireEntryStaff, requireMerchant } from '@/lib/luckyDraw/http';
import { listEntries } from '@/lib/services/luckyDraw/entryListService';
import { addStaffEntry } from '@/lib/services/luckyDraw/staffEntryService';
import { sendEntryConfirmation } from '@/lib/services/luckyDraw/entryService';

/** The owner's entry list; ?q= searches by entry number, phone ending or name. */
export async function GET(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { id } = await params;
    const q = new URL(request.url).searchParams.get('q') || '';
    return ok(await listEntries(merchantId, id, { q }));
  } catch (err) {
    return errorResponse(err);
  }
}

/** Staff type in a customer's entry at the counter. */
export async function POST(request, { params }) {
  try {
    const { error, account } = await requireEntryStaff();
    if (error) return error;
    const { id } = await params;
    const body = await readJson(request);
    const result = await addStaffEntry({
      account,
      campaignId: id,
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      billAmount: body.billAmount,
      consent: body.consent,
      storeId: body.storeId || null,
    });
    const confirmationSent = await sendEntryConfirmation({
      drawId: result.drawId,
      customerPhone: body.customerMobile,
      campaignName: result.campaignName,
      drawDate: result.drawDate,
    });
    return ok({ entryNumber: result.entryNumber, totalEntries: result.totalEntries, storeName: result.storeName, confirmationSent }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
