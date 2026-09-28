/**
 * Campaign soft delete ("archive") — the query middleware on campaignModel.
 *
 * Archived campaigns must vanish from every list/lookup by default, but stay
 * reachable where history is shown (a customer's past participation), via the
 * `includeDeleted` option.
 */
const mongoose = require('mongoose');
const Campaign = require('@/models/campaignModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;

const merchantId = new mongoose.Types.ObjectId();

async function makeCampaign(name, extra = {}) {
  return Campaign.create({
    merchantId,
    campaignName: name,
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    ...extra,
  });
}

async function archive(id) {
  // updateOne isn't hooked, so this reaches the document either way.
  await Campaign.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), status: 'ended' } });
}

describe('archived campaigns are hidden by default', () => {
  let live, gone;
  beforeEach(async () => {
    live = await makeCampaign('Live');
    gone = await makeCampaign('Gone');
    await archive(gone._id);
  });

  test('find', async () => {
    const names = (await Campaign.find({ merchantId }).lean()).map((c) => c.campaignName);
    expect(names).toEqual(['Live']);
  });

  test('findById / findOne — e.g. scanning an archived QR', async () => {
    expect(await Campaign.findById(gone._id)).toBeNull();
    expect(await Campaign.findOne({ campaignName: 'Gone' })).toBeNull();
    expect(await Campaign.findById(live._id)).not.toBeNull();
  });

  test('countDocuments', async () => {
    expect(await Campaign.countDocuments({ merchantId })).toBe(1);
  });

  test('distinct', async () => {
    expect(await Campaign.distinct('campaignName', { merchantId })).toEqual(['Live']);
  });

  test('findOneAndUpdate / findByIdAndUpdate cannot touch an archived campaign', async () => {
    const res = await Campaign.findByIdAndUpdate(gone._id, { status: 'active' }, { new: true });
    expect(res).toBeNull();
    const raw = await Campaign.collection.findOne({ _id: gone._id });
    expect(raw.status).toBe('ended');
  });

  test('aggregate', async () => {
    const rows = await Campaign.aggregate([{ $match: { merchantId } }, { $project: { campaignName: 1 } }]);
    expect(rows.map((r) => r.campaignName)).toEqual(['Live']);
  });

  test('aggregate keeps $geoNear-style stages first', async () => {
    // Just the pipeline shape — $geoNear itself needs a 2dsphere index.
    const agg = Campaign.aggregate([{ $geoNear: { near: { type: 'Point', coordinates: [0, 0] }, distanceField: 'd' } }]);
    await agg.exec().catch(() => {}); // runs the pre hook; the stage then errors without an index
    expect(Object.keys(agg.pipeline()[0])).toEqual(['$geoNear']);
    expect(agg.pipeline()[1]).toEqual({ $match: { isDeleted: { $ne: true } } });
  });
});

describe('opting in to see archived campaigns (history)', () => {
  let gone;
  beforeEach(async () => {
    await makeCampaign('Live');
    gone = await makeCampaign('Gone');
    await archive(gone._id);
  });

  test('setOptions({ includeDeleted: true })', async () => {
    const all = await Campaign.find({ merchantId }).setOptions({ includeDeleted: true }).lean();
    expect(all).toHaveLength(2);
  });

  test('findById with includeDeleted', async () => {
    const found = await Campaign.findById(gone._id).setOptions({ includeDeleted: true });
    expect(found?.campaignName).toBe('Gone');
  });

  test('explicit isDeleted in the filter is respected', async () => {
    const archived = await Campaign.find({ merchantId, isDeleted: true }).lean();
    expect(archived.map((c) => c.campaignName)).toEqual(['Gone']);
  });

  test('aggregate option({ includeDeleted: true })', async () => {
    const rows = await Campaign.aggregate([{ $match: { merchantId } }]).option({ includeDeleted: true });
    expect(rows).toHaveLength(2);
  });

  describe('populate — how the Customers page shows campaign names', () => {
    async function participationFor(campaignId) {
      return CustomerParticipation.collection.insertOne({
        campaign_id: campaignId,
        customer_mobile: '9876543210',
        customer_name: 'Test',
        status: 'revealed',
        createdAt: new Date(),
      });
    }

    test('without the option, an archived campaign populates as null', async () => {
      const { insertedId } = await participationFor(gone._id);
      const p = await CustomerParticipation.findById(insertedId).populate('campaign_id', 'campaignName').lean();
      expect(p.campaign_id).toBeNull();
    });

    test('with options.includeDeleted, the name still shows', async () => {
      const { insertedId } = await participationFor(gone._id);
      const p = await CustomerParticipation.findById(insertedId)
        .populate({ path: 'campaign_id', select: 'campaignName', options: { includeDeleted: true } })
        .lean();
      expect(p.campaign_id?.campaignName).toBe('Gone');
    });
  });
});

test('campaigns created before this field existed stay visible', async () => {
  // No isDeleted field at all — a pre-existing production document.
  await Campaign.collection.insertOne({ merchantId, campaignName: 'Legacy', status: 'active' });
  const names = (await Campaign.find({ merchantId }).lean()).map((c) => c.campaignName);
  expect(names).toContain('Legacy');
});
