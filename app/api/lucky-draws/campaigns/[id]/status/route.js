import { ValidationError } from '@/lib/errors';
import { ok, errorResponse, readJson, requireMerchant } from '@/lib/luckyDraw/http';
import { setCampaignStatus } from '@/lib/services/luckyDraw/campaignService';

const ALLOWED = ['active', 'paused'];

export async function PATCH(request, { params }) {
  try {
    const { error, merchantId } = await requireMerchant();
    if (error) return error;
    const { id } = await params;
    const { status } = await readJson(request);
    if (!ALLOWED.includes(status)) throw new ValidationError('Status must be "active" or "paused"');
    return ok(await setCampaignStatus(merchantId, id, status));
  } catch (err) {
    return errorResponse(err);
  }
}
