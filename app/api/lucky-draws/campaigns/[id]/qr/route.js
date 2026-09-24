import qrcode from 'qrcode';
import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { getOwnedCampaign } from '@/lib/services/luckyDraw/campaignService';

export async function GET(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { id } = await params;
    const campaign = await getOwnedCampaign(merchantId, id);

    const url = `${new URL(request.url).origin}/lucky-draw/${campaign._id}`;
    const dataUrl = await qrcode.toDataURL(url, { width: 512, margin: 2 });
    return ok({ url, dataUrl });
  } catch (err) {
    return errorResponse(err);
  }
}
