import qrcode from 'qrcode';
import { NotFoundError } from '@/lib/errors';
import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { getOwnedCampaign } from '@/lib/services/luckyDraw/campaignService';

/**
 * The customer QR. ?store=<storeId> makes a store's own QR (the entry page then pins entries to that
 * store, as the scratch campaign's store QR does); without it, one QR for the whole draw.
 */
export async function GET(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { id } = await params;
    const campaign = await getOwnedCampaign(merchantId, id);

    const requestUrl = new URL(request.url);
    const storeParam = requestUrl.searchParams.get('store');
    let url = `${requestUrl.origin}/lucky-draw/${campaign._id}`;
    let storeId = null;
    if (storeParam) {
      const store = campaign.assignedStores.find((s) => s.status === 'active' && String(s.storeId) === storeParam);
      if (!store) throw new NotFoundError('Store not found in this draw');
      storeId = String(store.storeId);
      url = `${url}?store=${storeId}`;
    }
    const dataUrl = await qrcode.toDataURL(url, { width: 512, margin: 2 });
    return ok({ url, dataUrl, storeId });
  } catch (err) {
    return errorResponse(err);
  }
}
