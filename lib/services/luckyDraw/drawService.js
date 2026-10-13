import crypto from 'crypto';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { createSeededRng, expandInDrawOrder, selectWinners } from './winnerSelection';
import { assertDrawOwner } from './openDraw';
import { claimAndFinishDraw } from './drawResult';

/**
 * Runs a campaign's draw: claims it atomically, picks winners, ends the campaign, then texts winners.
 * The atomic claim means two clicks on "Run draw" (or two tabs) cannot both run it.
 * Live online draws: the winners are stored hidden and nobody is texted yet; the owner then reveals
 * one prize at a time (see liveRevealService).
 */
export async function runDraw(drawId, { source, accountId = null, now = new Date(), seed = null } = {}) {
  requireObjectId(drawId, 'Draw not found');

  return claimAndFinishDraw(drawId, {
    triggeredBy: { source, accountId },
    alreadyClaimedMessage: 'This draw is not waiting to run. It may have already run.',
    now,
    logLabel: '[LuckyDraw] winner notification pass failed',
    build: async (draw) => {
      const campaign = await LuckyDrawCampaign.findById(draw.campaignId).lean();
      if (!campaign) throw new NotFoundError('Lucky Draw not found');
      const live = campaign.drawType === 'live_online';

      const entries = await LuckyDrawEntry.find({ drawId: draw._id }).sort({ _id: 1 }).lean();
      const randomSeed = seed || crypto.randomBytes(8).toString('hex');
      // Grand prize first, so whoever wins it cannot also win a smaller prize.
      const slots = expandInDrawOrder([...campaign.prizeTiers].sort((a, b) => a.rank - b.rank));
      const selected = selectWinners(entries, slots, createSeededRng(randomSeed), { ordered: true });

      return {
        campaign,
        winners: selected.map((w) => ({
          rank: w.rank,
          entry: w.entry,
          prizeDescription: w.prizeDescription,
          prizeValue: w.prizeValue,
          hiddenUntilReveal: live,
        })),
        entryCount: entries.length,
        randomSeed,
        // Digital draws are shown in full as soon as they run; a live reveal starts with nothing shown.
        reveal: live
          ? { revealedCount: 0, startedAt: now }
          : { revealedCount: campaign.prizeTiers.length, startedAt: now, completedAt: now },
      };
    },
  });
}

const RUN_REFUSED = {
  physical: 'Physical draws are held in your shop. Use Pick winners to record who won.',
  live_online: 'Live online draws are started from the live reveal page.',
};

/** The owner's "Run draw" button. Only digital draws pick every winner in one go. */
export async function runOwnerDraw(merchantId, drawId, { now = new Date(), seed = null } = {}) {
  const { campaign } = await assertDrawOwner(drawId, merchantId);
  if (campaign.drawType !== 'digital') {
    throw new ConflictError(RUN_REFUSED[campaign.drawType] || 'This draw cannot be run from here.');
  }
  return runDraw(drawId, { source: 'manual', accountId: merchantId, now, seed });
}
