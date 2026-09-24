import { ok, errorResponse, requireMerchant } from '@/lib/luckyDraw/http';
import { getCampaignDetail } from '@/lib/services/luckyDraw/campaignService';

export async function GET(_request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { id } = await params;
    return ok(await getCampaignDetail(merchantId, id));
  } catch (err) {
    return errorResponse(err);
  }
}
