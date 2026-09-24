import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import { NotFoundError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { initialDrawDate } from './schedule';

/**
 * The campaign's single open (scheduled) draw. Created on first need. The
 * partial unique index on LuckyDraw guarantees only one can exist; if two
 * requests race, the loser reads the winner's document.
 */
export async function ensureOpenDraw(campaign, now = new Date()) {
  const existing = await LuckyDraw.findOne({ campaignId: campaign._id, status: 'scheduled' }).lean();
  if (existing) return existing;

  try {
    const created = await LuckyDraw.create({
      campaignId: campaign._id,
      periodStart: now,
      drawDate: initialDrawDate(campaign, now),
      status: 'scheduled',
    });
    return created.toObject();
  } catch (error) {
    if (error?.code === 11000) {
      return LuckyDraw.findOne({ campaignId: campaign._id, status: 'scheduled' }).lean();
    }
    throw error;
  }
}

/** Loads a draw and its campaign, only if the merchant owns the campaign. */
export async function assertDrawOwner(drawId, merchantId) {
  requireObjectId(drawId, 'Draw not found');
  const draw = await LuckyDraw.findById(drawId).lean();
  if (!draw) throw new NotFoundError('Draw not found');

  const campaign = await LuckyDrawCampaign.findOne({ _id: draw.campaignId, merchantId }).lean();
  if (!campaign) throw new NotFoundError('Draw not found');

  return { draw, campaign };
}
