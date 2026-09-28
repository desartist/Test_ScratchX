/**
 * CampaignService.deleteCampaign — delete in ANY status.
 *
 * No history → hard delete with cascade. Any history → archive, so customer
 * participations, won coupons and scan history keep their campaign.
 */
const mongoose = require('mongoose');
const CampaignService = require('@/lib/campaignService').default;
const Campaign = require('@/models/campaignModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;
const ScratchAllocationRequest = require('@/models/scratchAllocationRequestModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const Store = require('@/models/storeModel').default;
const Range = require('@/models/rangeModel').default;

const merchantId = new mongoose.Types.ObjectId();

async function makeCampaign(status = 'active') {
  return Campaign.create({
    merchantId,
    campaignName: `Camp ${status}`,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    status,
  });
}

async function makeStoreWith(campaign) {
  const store = await Store.create({
    ...global.createMockStore(merchantId),
    assignedCampaigns: [{ campaignId: campaign._id, campaignName: campaign.campaignName }],
  });
  return store;
}

const raw = (id) => Campaign.collection.findOne({ _id: id });

describe('no customer history → hard delete', () => {
  test.each(['draft', 'active', 'paused', 'ended'])('deletes a %s campaign', async (status) => {
    const c = await makeCampaign(status);
    const result = await CampaignService.deleteCampaign(c._id);
    expect(result.mode).toBe('deleted');
    expect(await raw(c._id)).toBeNull();
  });

  test('cleans up ranges and store assignments', async () => {
    const c = await makeCampaign('active');
    const store = await makeStoreWith(c);
    await Range.collection.insertOne({ campaignId: c._id, minAmount: 0, maxAmount: 500 });

    const result = await CampaignService.deleteCampaign(c._id);

    expect(result.cascadeCleanupStats.storesCleaned).toBe(1);
    expect(await Range.collection.countDocuments({ campaignId: c._id })).toBe(0);
    const s = await Store.findById(store._id).lean();
    expect(s.assignedCampaigns).toHaveLength(0);
  });
});

describe('has customer history → archive', () => {
  async function withParticipation(status = 'active') {
    const c = await makeCampaign(status);
    await CustomerParticipation.collection.insertOne({
      campaign_id: c._id,
      customer_mobile: '9876543210',
      customer_name: 'Riya',
      status: 'revealed',
      createdAt: new Date(),
    });
    return c;
  }

  test('an ACTIVE campaign customers used can now be deleted (the request)', async () => {
    const c = await withParticipation('active');
    const result = await CampaignService.deleteCampaign(c._id);
    expect(result.mode).toBe('archived');

    const doc = await raw(c._id);
    expect(doc).not.toBeNull(); // still in the DB
    expect(doc.isDeleted).toBe(true);
    expect(doc.deletedAt).toBeInstanceOf(Date);
    expect(doc.status).toBe('ended');
  });

  test('archived campaign disappears from lists and its QR lookup', async () => {
    const c = await withParticipation();
    await CampaignService.deleteCampaign(c._id);
    expect(await Campaign.findById(c._id)).toBeNull(); // scan flow → not found
    expect(await Campaign.countDocuments({ merchantId })).toBe(0);
  });

  test('customer history keeps the campaign name', async () => {
    const c = await withParticipation();
    await CampaignService.deleteCampaign(c._id);
    const p = await CustomerParticipation.findOne({ campaign_id: c._id })
      .populate({ path: 'campaign_id', select: 'campaignName', options: { includeDeleted: true } })
      .lean();
    expect(p).not.toBeNull();
    expect(p.campaign_id.campaignName).toBe('Camp active');
  });

  test('keeps ranges (participations point at them) but leaves store lists', async () => {
    const c = await withParticipation();
    const store = await makeStoreWith(c);
    await Range.collection.insertOne({ campaignId: c._id, minAmount: 0, maxAmount: 500 });

    await CampaignService.deleteCampaign(c._id);

    expect(await Range.collection.countDocuments({ campaignId: c._id })).toBe(1);
    const s = await Store.findById(store._id).lean();
    expect(s.assignedCampaigns).toHaveLength(0);
  });

  test('closes pending scratch requests and cancels live store allocations', async () => {
    const c = await withParticipation();
    // Mappings are unique per campaign + store + merchant, so two stores.
    const [storeA, storeB] = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    await ScratchAllocationRequest.collection.insertMany([
      { campaignId: c._id, merchantId, quantity: 100, status: 'pending' },
      { campaignId: c._id, merchantId, quantity: 50, status: 'approved' },
    ]);
    await CampaignStoreMapping.collection.insertMany([
      { campaign_id: c._id, store_id: storeA, merchant_id: merchantId, status: 'active', allocated_scratch_cards: 10 },
      { campaign_id: c._id, store_id: storeB, merchant_id: merchantId, status: 'completed', allocated_scratch_cards: 5 },
    ]);

    const result = await CampaignService.deleteCampaign(c._id);
    expect(result.cascadeCleanupStats.pendingRequestsClosed).toBe(1);
    expect(result.cascadeCleanupStats.storeAllocationsCancelled).toBe(1);

    const reqs = await ScratchAllocationRequest.collection.find({ campaignId: c._id }).toArray();
    const pending = reqs.find((r) => r.quantity === 100);
    expect(pending.status).toBe('rejected');
    expect(pending.responseNote).toBe('Campaign was deleted');
    expect(reqs.find((r) => r.quantity === 50).status).toBe('approved'); // untouched

    const maps = await CampaignStoreMapping.collection.find({ campaign_id: c._id }).toArray();
    expect(maps.map((m) => m.status).sort()).toEqual(['cancelled', 'completed']);
  });

  test('a store allocation alone counts as history (ledger entry exists)', async () => {
    const c = await makeCampaign('active');
    await CampaignStoreMapping.collection.insertOne({
      campaign_id: c._id, store_id: new mongoose.Types.ObjectId(), merchant_id: merchantId, status: 'active',
    });
    const result = await CampaignService.deleteCampaign(c._id);
    expect(result.mode).toBe('archived');
  });

  test('deleting an already-archived campaign reports not found', async () => {
    const c = await withParticipation();
    await CampaignService.deleteCampaign(c._id);
    await expect(CampaignService.deleteCampaign(c._id)).rejects.toThrow('Campaign not found');
  });
});
