import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import { getOwnedCampaign } from './campaignService';

const MAX_LIMIT = 100;
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The owner's view of a draw's entries, newest number first. `q` finds an entry by its number
 * ("12" or "#12"), the end of the customer's phone number, or part of their name or email.
 */
export async function listEntries(merchantId, campaignId, { q = '', limit = 50 } = {}) {
  const campaign = await getOwnedCampaign(merchantId, campaignId);
  const filter = { campaignId: campaign._id };

  const term = String(q || '').trim();
  if (term) {
    const or = [
      { customerName: { $regex: escapeRegex(term), $options: 'i' } },
      { customerEmail: { $regex: escapeRegex(term), $options: 'i' } },
    ];
    const digits = term.replace(/^#/, '');
    if (/^\d+$/.test(digits)) {
      or.push({ entryNumber: Number(digits) }, { customerPhone: { $regex: `${digits}$` } });
    }
    filter.$or = or;
  }

  const [entries, total] = await Promise.all([
    LuckyDrawEntry.find(filter).sort({ entryNumber: -1 }).limit(Math.min(Math.max(1, Number(limit) || 50), MAX_LIMIT)).lean(),
    LuckyDrawEntry.countDocuments({ campaignId: campaign._id }),
  ]);
  const storeNames = new Map(campaign.assignedStores.map((s) => [String(s.storeId), s.storeName]));

  return {
    total,
    entries: entries.map((e) => ({
      _id: e._id,
      entryNumber: e.entryNumber,
      customerName: e.customerName,
      customerPhone: e.customerPhone,
      customerEmail: e.customerEmail || null,
      billAmount: e.billAmount ?? null,
      source: e.source,
      storeName: storeNames.get(String(e.storeId)) || '',
      createdAt: e.createdAt,
    })),
  };
}
