import Account from '@/models/accountModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import { NotFoundError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';

/** Everything the public entry page needs, and nothing internal (no merchant or store ids). */
export async function getPublicCampaign(campaignId, now = new Date()) {
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findById(campaignId).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');

  const [draw, merchant] = await Promise.all([
    LuckyDraw.findOne({ campaignId, status: 'scheduled' }).lean(),
    Account.findById(campaign.merchantId).select('profile.businessModel').lean(),
  ]);
  const lastChange = draw?.dateHistory?.length ? draw.dateHistory[draw.dateHistory.length - 1] : null;

  return {
    id: String(campaign._id),
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    isOpen: campaign.status === 'active' && now >= campaign.startDate && now <= campaign.endDate,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    drawDate: draw?.drawDate ?? null,
    previousDrawDate: lastChange?.previousDate ?? null,
    entryTiers: campaign.entryTiers,
    prizeMode: campaign.prizeMode || 'shared',
    prizes: campaign.prizeTiers.map(({ rank, prizeDescription, tierIndexes }) => ({
      rank,
      prizeDescription,
      tierIndexes: tierIndexes || [],
    })),
    stores: campaign.assignedStores
      .filter((s) => s.status === 'active')
      .map(({ storeName, city }) => ({ storeName, city })),
    // Wholesale merchants sell to other businesses, so the "customer is at the store" GPS rule does not apply.
    requiresLocation: merchant?.profile?.businessModel !== 'Wholesale',
    maxEntriesPerCustomerPerPeriod: campaign.maxEntriesPerCustomerPerPeriod,
    notice: DATE_CHANGE_NOTICE,
  };
}
