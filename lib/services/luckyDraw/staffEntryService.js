import mongoose from 'mongoose';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { ENTRY_ROLES, STAFF_ENTRY_DRAW_TYPES } from '@/lib/luckyDraw/constants';
import { resolveMerchantId } from './redemptionService';
import { createEntry } from './entryService';

const STORE_ROLES = ['Store_Manager', 'Store_Staff'];
const isStoreRole = (account) => STORE_ROLES.includes(account.role);

async function merchantFor(account) {
  if (!ENTRY_ROLES.includes(account.role)) throw new AuthorizationError('Your role cannot add Lucky Draw entries');
  const merchantId = await resolveMerchantId(account);
  if (!merchantId) throw new AuthorizationError('Your account is not linked to a store owner');
  return merchantId;
}

/**
 * A staff member types in a customer's entry at the counter (Physical and Live online draws).
 * Store managers and staff always add entries at their own store; the merchant and managers choose
 * the store (or get the only one).
 */
export async function addStaffEntry({ account, campaignId, customerName, customerMobile, billAmount, consent, storeId = null, now = new Date() }) {
  const merchantId = await merchantFor(account);
  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findOne({ _id: campaignId, merchantId }).select('assignedStores').lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');

  const active = campaign.assignedStores.filter((s) => s.status === 'active');
  let atStore;
  if (isStoreRole(account)) {
    atStore = active.find((s) => String(s.storeId) === String(account.storeId));
    if (!atStore) throw new ValidationError('Your store is not part of this Lucky Draw');
  } else {
    atStore = storeId ? active.find((s) => String(s.storeId) === String(storeId)) : active.length === 1 ? active[0] : null;
    if (!atStore) throw new ValidationError('Choose the store this bill is from');
  }

  return createEntry(
    {
      campaignId,
      customerName,
      customerMobile,
      billAmount,
      consent,
      source: 'staff',
      storeId: atStore.storeId,
      addedByAccountId: account._id,
    },
    now,
  );
}

/** Open draws the caller can add entries to, with how many entries they hold so far (at their store, for store roles). */
export async function listStaffDraws(account, now = new Date()) {
  const merchantId = await merchantFor(account);
  if (isStoreRole(account) && !account.storeId) return [];

  const filter = {
    merchantId,
    status: 'active',
    drawType: { $in: STAFF_ENTRY_DRAW_TYPES },
    startDate: { $lte: now },
    endDate: { $gte: now },
  };
  if (isStoreRole(account)) filter['assignedStores.storeId'] = account.storeId;

  const campaigns = await LuckyDrawCampaign.find(filter)
    .select('name drawType minBillAmount endDate assignedStores')
    .sort({ endDate: 1 })
    .lean();
  if (campaigns.length === 0) return [];

  const match = { campaignId: { $in: campaigns.map((c) => c._id) } };
  if (isStoreRole(account)) match.storeId = new mongoose.Types.ObjectId(String(account.storeId));
  const counts = await LuckyDrawEntry.aggregate([{ $match: match }, { $group: { _id: '$campaignId', count: { $sum: 1 } } }]);
  const byCampaign = new Map(counts.map((row) => [String(row._id), row.count]));

  // Store roles only ever add entries at their own store, so that is the only store they are offered.
  const offered = (c) =>
    c.assignedStores.filter((s) => s.status === 'active' && (!isStoreRole(account) || String(s.storeId) === String(account.storeId)));

  return campaigns.map((c) => ({
    _id: c._id,
    name: c.name,
    drawType: c.drawType,
    minBillAmount: c.minBillAmount,
    endDate: c.endDate,
    stores: offered(c).map((s) => ({ storeId: s.storeId, storeName: s.storeName })),
    entryCount: byCampaign.get(String(c._id)) || 0,
  }));
}
