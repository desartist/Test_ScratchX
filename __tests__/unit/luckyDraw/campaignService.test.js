jest.mock('@/lib/subscriptionAccessGuard', () => ({ checkPlanAccess: jest.fn() }));

import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import Store from '@/models/storeModel';
import Campaign from '@/models/campaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import {
  createCampaign,
  setCampaignStatus,
  listCampaigns,
  getCampaignDetail,
  getOwnedCampaign,
} from '@/lib/services/luckyDraw/campaignService';
import { AuthorizationError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { createEntry, createOpenDraw, campaignData, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());

const allow = (maxCampaigns = 5) =>
  checkPlanAccess.mockResolvedValue({ allowed: true, plan: { name: 'Smart', limits: { maxCampaigns } } });

let storeSeq = 0;
async function seedStore(merchantId, overrides = {}) {
  // createMockStore derives store_code from Date.now(); two stores in one millisecond collide on the unique index.
  const store = global.createMockStore(merchantId, { store_code: `LD${++storeSeq}`, ...overrides });
  await Store.collection.insertOne(store); // raw insert: skips unrelated Store validation
  return store;
}

const baseInput = (overrides = {}) => ({
  drawType: 'digital',
  name: 'Diwali Lucky Draw',
  description: 'Win big',
  startDate: new Date(Date.now() - DAY).toISOString(),
  endDate: new Date(Date.now() + 30 * DAY).toISOString(),
  revealDate: new Date(Date.now() + 32 * DAY).toISOString(),
  minBillAmount: 1000,
  prizes: [
    { rank: 1, prizeDescription: 'Smart TV', prizeValue: 30000, quantity: 1 },
    { rank: 2, prizeDescription: 'Mixer', prizeValue: 2000, quantity: 3 },
  ],
  ...overrides,
});

beforeEach(() => {
  checkPlanAccess.mockReset();
  allow();
});

describe('createCampaign', () => {
  it('creates a draft with every active store, the draw type, minimum bill and prize levels', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);

    const campaign = await createCampaign(String(merchantId), baseInput());

    expect(campaign.status).toBe('draft');
    expect(campaign.assignedStores).toHaveLength(1);
    expect(campaign.assignedStores[0]).toMatchObject({
      storeName: store.store_name,
      latitude: store.latitude,
      longitude: store.longitude,
      status: 'active',
    });
    expect(campaign.prizeTiers.map((p) => [p.rank, p.prizeDescription])).toEqual([
      [1, 'Smart TV'],
      [2, 'Mixer'],
    ]);
    expect(campaign).toMatchObject({ drawType: 'digital', minBillAmount: 1000, entryCounter: 0 });
    expect(campaign.prizeTiers.map((p) => [p.rank, p.quantity])).toEqual([[1, 1], [2, 3]]);
  });

  it('refuses when the plan does not include Lucky Draw', async () => {
    checkPlanAccess.mockResolvedValue({ allowed: false, reason: 'This feature is not available in the Core plan' });
    const merchantId = newId();
    await seedStore(merchantId);
    await expect(createCampaign(String(merchantId), baseInput())).rejects.toThrow(AuthorizationError);
    await expect(createCampaign(String(merchantId), baseInput())).rejects.toThrow('not available in the Core plan');
  });

  it.each([
    ['no prizes', { prizes: [] }, /prize/i],
    ['a blank prize', { prizes: [{ prizeDescription: '  ' }] }, /prize/i],
    ['a short name', { name: 'ab' }, /name/i],
    ['end before start', { endDate: new Date(Date.now() - 2 * DAY).toISOString() }, /end date/i],
    ['a bad date', { startDate: 'not-a-date' }, /valid start and end/i],
  ])('rejects %s', async (_label, patch, message) => {
    const merchantId = newId();
    await seedStore(merchantId);
    await expect(createCampaign(String(merchantId), baseInput(patch))).rejects.toThrow(ValidationError);
    await expect(createCampaign(String(merchantId), baseInput(patch))).rejects.toThrow(message);
  });
});

describe('setCampaignStatus', () => {
  async function draftCampaign(merchantId, overrides = {}) {
    await seedStore(merchantId);
    return LuckyDrawCampaign.create(campaignData({ merchantId, status: 'draft', ...overrides }));
  }

  it('activates a draft and creates its open draw', async () => {
    const merchantId = newId();
    const draft = await draftCampaign(merchantId);

    const active = await setCampaignStatus(String(merchantId), String(draft._id), 'active');

    expect(active.status).toBe('active');
    const draw = await LuckyDraw.findOne({ campaignId: draft._id, status: 'scheduled' });
    expect(draw).not.toBeNull();
    expect(draw.drawDate).toEqual(draft.endDate);
  });

  it('pauses an active campaign and resumes it without duplicating the open draw', async () => {
    const merchantId = newId();
    const draft = await draftCampaign(merchantId);
    await setCampaignStatus(String(merchantId), String(draft._id), 'active');
    expect((await setCampaignStatus(String(merchantId), String(draft._id), 'paused')).status).toBe('paused');
    expect((await setCampaignStatus(String(merchantId), String(draft._id), 'active')).status).toBe('active');
    expect(await LuckyDraw.countDocuments({ campaignId: draft._id, status: 'scheduled' })).toBe(1);
  });

  it('rejects impossible transitions', async () => {
    const merchantId = newId();
    const draft = await draftCampaign(merchantId);
    await expect(setCampaignStatus(String(merchantId), String(draft._id), 'paused')).rejects.toThrow(ConflictError);
    const ended = await draftCampaign(merchantId, { status: 'ended' });
    await expect(setCampaignStatus(String(merchantId), String(ended._id), 'active')).rejects.toThrow(ConflictError);
  });

  it('refuses to activate once the end date has passed', async () => {
    const merchantId = newId();
    const past = await draftCampaign(merchantId, {
      startDate: new Date(Date.now() - 10 * DAY),
      endDate: new Date(Date.now() - DAY),
    });
    await expect(setCampaignStatus(String(merchantId), String(past._id), 'active')).rejects.toThrow(/end date/i);
  });

  it('counts active Scratch Card campaigns against the plan limit', async () => {
    allow(2);
    const merchantId = newId();
    await Campaign.collection.insertOne({ merchantId, status: 'active' });
    await LuckyDrawCampaign.create(campaignData({ merchantId, status: 'active' }));
    const draft = await draftCampaign(merchantId);

    await expect(setCampaignStatus(String(merchantId), String(draft._id), 'active')).rejects.toThrow(ConflictError);
    await expect(setCampaignStatus(String(merchantId), String(draft._id), 'active')).rejects.toThrow(/allows 2 active campaigns/);
  });

  it('does not limit an unlimited plan', async () => {
    allow(-1);
    const merchantId = newId();
    await Campaign.collection.insertMany([{ merchantId, status: 'active' }, { merchantId, status: 'active' }]);
    const draft = await draftCampaign(merchantId);
    await expect(setCampaignStatus(String(merchantId), String(draft._id), 'active')).resolves.toMatchObject({ status: 'active' });
  });

  it('refuses to activate when the plan lost the feature', async () => {
    const merchantId = newId();
    const draft = await draftCampaign(merchantId);
    checkPlanAccess.mockResolvedValue({ allowed: false, reason: 'No active subscription found for this merchant' });
    await expect(setCampaignStatus(String(merchantId), String(draft._id), 'active')).rejects.toThrow(AuthorizationError);
  });

  it('treats another merchant\'s campaign and bad ids as not found', async () => {
    const draft = await draftCampaign(newId());
    await expect(setCampaignStatus(String(newId()), String(draft._id), 'active')).rejects.toThrow(NotFoundError);
    await expect(setCampaignStatus(String(newId()), 'nope', 'active')).rejects.toThrow(NotFoundError);
  });
});

describe('listCampaigns and getCampaignDetail', () => {
  it('lists only the merchant\'s campaigns with the next draw date', async () => {
    const merchantId = newId();
    const mine = await LuckyDrawCampaign.create(campaignData({ merchantId }));
    await LuckyDrawCampaign.create(campaignData({ merchantId: newId() }));
    const draw = await createOpenDraw(mine);

    const list = await listCampaigns(String(merchantId));

    expect(list).toHaveLength(1);
    expect(new Date(list[0].nextDrawDate)).toEqual(draw.drawDate);
  });

  it('reports open draw stats, due state, past draws and winners', async () => {
    const merchantId = newId();
    const campaign = await LuckyDrawCampaign.create(campaignData({ merchantId }));
    const draw = await createOpenDraw(campaign, { drawDate: new Date(Date.now() - 1000) });
    await createEntry(campaign, draw, { customerPhone: '9000000001' });
    await createEntry(campaign, draw, { customerPhone: '9000000001' });
    await createEntry(campaign, draw, { customerPhone: '9000000002' });

    const detail = await getCampaignDetail(String(merchantId), String(campaign._id));

    expect(detail.openDraw).toMatchObject({ entryCount: 3, customerCount: 2, isDue: true });
    expect(detail.pastDraws).toEqual([]);
    expect(detail.winners).toEqual([]);
  });

  it('hides other merchants\' campaigns', async () => {
    const campaign = await LuckyDrawCampaign.create(campaignData());
    await expect(getCampaignDetail(String(newId()), String(campaign._id))).rejects.toThrow(NotFoundError);
    await expect(getCampaignDetail(String(newId()), 'nope')).rejects.toThrow(NotFoundError);
  });
});

describe('getOwnedCampaign', () => {
  it('returns the merchant\'s own campaign and hides everyone else\'s', async () => {
    const merchantId = newId();
    const mine = await LuckyDrawCampaign.create(campaignData({ merchantId }));
    expect(String((await getOwnedCampaign(String(merchantId), String(mine._id)))._id)).toBe(String(mine._id));
    await expect(getOwnedCampaign(String(newId()), String(mine._id))).rejects.toThrow(NotFoundError);
    await expect(getOwnedCampaign(String(merchantId), 'nope')).rejects.toThrow(NotFoundError);
  });
});

describe('createCampaign: client flow rules', () => {
  it('takes every active store of the merchant and nothing else', async () => {
    const merchantId = newId();
    const a = await seedStore(merchantId, { store_name: 'Andheri' });
    const b = await seedStore(merchantId, { store_name: 'Bandra' });
    await seedStore(merchantId, { store_name: 'Closed', status: 'inactive' });
    await seedStore(newId(), { store_name: 'Someone else' });

    const campaign = await createCampaign(String(merchantId), baseInput({ storeIds: [String(newId())] }));

    expect(campaign.assignedStores.map((s) => String(s.storeId)).sort()).toEqual([String(a._id), String(b._id)].sort());
  });

  it('refuses a merchant with no active store', async () => {
    await expect(createCampaign(String(newId()), baseInput())).rejects.toThrow('You have no active stores. Add a store first.');
  });

  it('runs a physical draw at a store without a location, but not a digital one', async () => {
    const merchantId = newId();
    await seedStore(merchantId, { latitude: null, longitude: null });
    await expect(createCampaign(String(merchantId), baseInput({ drawType: 'physical' }))).resolves.toMatchObject({ drawType: 'physical' });
    await expect(createCampaign(String(merchantId), baseInput({ drawType: 'digital' }))).rejects.toThrow(/scan in at a store with a location/);
  });

  it('needs a known draw type and a whole-rupee minimum bill', async () => {
    const merchantId = newId();
    await seedStore(merchantId);
    await expect(createCampaign(String(merchantId), baseInput({ drawType: 'weekly' }))).rejects.toThrow('Choose how the draw runs: physical, live online or digital');
    await expect(createCampaign(String(merchantId), baseInput({ minBillAmount: 99.5 }))).rejects.toThrow('Enter the minimum bill amount in whole rupees');
    await expect(createCampaign(String(merchantId), baseInput({ minBillAmount: -1 }))).rejects.toThrow('Enter the minimum bill amount in whole rupees');
    await expect(createCampaign(String(merchantId), baseInput({ minBillAmount: undefined }))).rejects.toThrow('Enter the minimum bill amount in whole rupees');
  });

  it('needs the grand prize and the 2nd prize', async () => {
    const merchantId = newId();
    await seedStore(merchantId);
    await expect(createCampaign(String(merchantId), baseInput({ prizes: [{ rank: 1, prizeDescription: 'TV', prizeValue: 1000 }] }))).rejects.toThrow(/grand prize and the 2nd prize/);
  });

  it('ignores the old settings if a client still sends them', async () => {
    const merchantId = newId();
    await seedStore(merchantId);
    const campaign = await createCampaign(String(merchantId), baseInput({ scheduleType: 'recurring', entryTiers: [{ minAmount: 5 }], prizeMode: 'restricted', revealMode: 'live' }));
    for (const key of ['drawConfig', 'entryTiers', 'prizeMode', 'revealMode']) expect(campaign).not.toHaveProperty(key);
  });

  it('refreshes the stores when the draft is published', async () => {
    const merchantId = newId();
    await seedStore(merchantId, { store_name: 'Andheri' });
    const campaign = await createCampaign(String(merchantId), baseInput());
    const later = await seedStore(merchantId, { store_name: 'Powai' });

    const published = await setCampaignStatus(String(merchantId), String(campaign._id), 'active');

    expect(published.assignedStores.map((s) => s.storeName).sort()).toEqual(['Andheri', 'Powai']);
    expect(published.assignedStores.some((s) => String(s.storeId) === String(later._id))).toBe(true);
  });
});
