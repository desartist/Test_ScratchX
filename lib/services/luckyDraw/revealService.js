import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { NotFoundError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { revealOrder } from '@/lib/luckyDraw/prizeCategories';

/** "Priya Shah" -> "Priya S." so a public page never shows a full name. */
export function maskName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Winner';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function publicWinner(winner, storeNames) {
  const phone = String(winner.customerPhone || '');
  const store = winner.redeemedAtStoreId ? storeNames.get(String(winner.redeemedAtStoreId)) : null;
  return { label: maskName(winner.customerName), sub: phone ? `Phone ending ${phone.slice(-4)}` : store || '' };
}

/**
 * Everything the public reveal page shows: the prize categories in reveal order (smallest first)
 * and the winners of the categories revealed so far. Never returns claim codes or full phone numbers.
 */
export async function getPublicReveal(campaignId) {
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findById(campaignId).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');

  // The draw being revealed, or the latest finished one; otherwise the upcoming one.
  const settled = await LuckyDraw.findOne({ campaignId, 'reveal.startedAt': { $exists: true } })
    .sort({ executedAt: -1 })
    .lean();
  const upcoming = settled ? null : await LuckyDraw.findOne({ campaignId, status: 'scheduled' }).lean();
  const draw = settled || upcoming;

  const prizes = settled?.prizeTiersSnapshot?.length ? settled.prizeTiersSnapshot : campaign.prizeTiers;
  const order = revealOrder(prizes);
  const revealedCount = settled ? settled.reveal?.revealedCount || 0 : 0;
  const revealedRanks = new Set(order.slice(0, revealedCount));

  const winners = settled
    ? await LuckyDrawWinner.find({ drawId: settled._id, rank: { $in: [...revealedRanks] } })
        .sort({ rank: 1, createdAt: 1 })
        .lean()
    : [];
  const storeNames = new Map(campaign.assignedStores.map((s) => [String(s.storeId), s.storeName]));

  const byRank = new Map(prizes.map((p) => [p.rank, p]));
  const categories = order.map((rank) => {
    const prize = byRank.get(rank);
    return {
      rank,
      name: prize.prizeDescription,
      value: prize.prizeValue || 0,
      quantity: prize.quantity || 1,
      imageUrl: prize.imageUrl || null,
      revealed: revealedRanks.has(rank),
      winners: winners.filter((w) => w.rank === rank).map((w) => publicWinner(w, storeNames)),
    };
  });

  let status = 'not_started';
  if (settled) status = settled.reveal?.completedAt ? 'done' : 'live';

  return {
    id: String(campaign._id),
    name: campaign.name,
    revealMode: campaign.revealMode || 'instant',
    revealDate: draw?.drawDate ?? campaign.revealDate ?? campaign.endDate,
    status,
    revealedCount,
    totalCategories: order.length,
    storeNames: campaign.assignedStores.filter((s) => s.status === 'active').map((s) => s.storeName),
    categories,
  };
}
