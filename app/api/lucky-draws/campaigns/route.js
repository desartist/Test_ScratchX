import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { createCampaign, listCampaigns } from '@/lib/services/luckyDraw/campaignService';

export async function GET() {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    return ok(await listCampaigns(merchantId));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const body = await readJson(request);
    return ok(await createCampaign(merchantId, body), 201);
  } catch (err) {
    return errorResponse(err);
  }
}
