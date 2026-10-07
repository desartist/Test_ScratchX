import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import { sendSms, messages } from './notifier';

/**
 * Texts every pending, unexpired winner (optionally only those of one draw).
 * A failed SMS never throws: the winner stays `pending` so the cron retries.
 */
export async function notifyPendingWinners({ drawId = null, now = new Date(), limit = 200 } = {}) {
  // Slip winners (manual modes) have no phone number; they show their slip at the store.
  const filter = { status: 'pending', expiresAt: { $gt: now }, customerPhone: { $nin: ['', null] } };
  if (drawId) filter.drawId = drawId;

  const winners = await LuckyDrawWinner.find(filter).sort({ createdAt: 1 }).limit(limit);
  const campaignNames = new Map();
  let sent = 0;
  let failed = 0;

  for (const winner of winners) {
    try {
      const key = String(winner.campaignId);
      if (!campaignNames.has(key)) {
        const campaign = await LuckyDrawCampaign.findById(winner.campaignId).select('name').lean();
        campaignNames.set(key, campaign?.name || 'the Lucky Draw');
      }

      await sendSms(
        winner.customerPhone,
        messages.winner({
          campaignName: campaignNames.get(key),
          rank: winner.rank,
          prizeDescription: winner.prizeDescription,
          claimCode: winner.claimCode,
          expiresAt: winner.expiresAt,
        }),
      );

      winner.status = 'notified';
      winner.notifiedAt = now;
      await winner.save();
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error('[LuckyDraw] winner SMS failed', String(winner._id), error.message);
    }
  }

  return { sent, failed };
}
