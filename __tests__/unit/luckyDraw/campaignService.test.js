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

const baseInput = (storeId) => ({
  name: 'Diwali Lucky Draw',
  description: 'Win big',
  startDate: new Date(Date.now() - DAY).toISOString(),
  endDate: new Date(Date.now() + 30 * DAY).toISOString(),
  storeIds: [String(storeId)],
  entryTiers: [
    { minAmount: 500, maxAmount: 1000, entriesGranted: 1 },
    { minAmount: 1000, maxAmount: null, entriesGranted: 3 },
  ],
  prizes: [{ prizeDescription: 'Smart TV', prizeValue: 30000 }, { prizeDescription: 'Mixer' }],
  scheduleType: 'end_of_campaign',
});

beforeEach(() => {
  checkPlanAccess.mockReset();
  allow();
});

describe('createCampaign', () => {
  it('creates a draft with store snapshots, ranked prizes and the default trigger mode', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);

    const campaign = await createCampaign(String(merchantId), baseInput(store._id));

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
    expect(campaign.drawConfig.triggerMode).toBe('automatic');
  });

  it('stores a manual trigger mode and a weekly recurrence', async () => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    const campaign = await createCampaign(String(merchantId), {
      ...baseInput(store._id),
      scheduleType: 'recurring',
      triggerMode: 'manual',
      recurrence: { frequency: 'weekly', time: '19:30', dayOfWeek: 6 },
    });
    expect(campaign.drawConfig).toMatchObject({
      scheduleType: 'recurring',
      triggerMode: 'manual',
      recurrence: { frequency: 'weekly', time: '19:30', dayOfWeek: 6 },
    });
  });

  it('refuses when the plan does not include Lucky Draw', async () => {
    checkPlanAccess.mockResolvedValue({ allowed: false, reason: 'This feature is not available in the Core plan' });
    const merchantId = newId();
    const store = await seedStore(merchantId);
    await expect(createCampaign(String(merchantId), baseInput(store._id))).rejects.toThrow(AuthorizationError);
    await expect(createCampaign(String(merchantId), baseInput(store._id))).rejects.toThrow('not available in the Core plan');
  });

  it.each([
    ['overlapping tiers', { entryTiers: [{ minAmount: 0, maxAmount: 1000, entriesGranted: 1 }, { minAmount: 500, maxAmount: null, entriesGranted: 2 }] }, /overlap/],
    ['no prizes', { prizes: [] }, /prize/i],
    ['a blank prize', { prizes: [{ prizeDescription: '  ' }] }, /prize/i],
    ['no stores', { storeIds: [] }, /store/i],
    ['a short name', { name: 'ab' }, /name/i],
    ['end before start', { endDate: new Date(Date.now() - 2 * DAY).toISOString() }, /end date/i],
    ['a bad date', { startDate: 'not-a-date' }, /valid start and end/i],
    ['an unknown schedule type', { scheduleType: 'monthly' }, /schedule/i],
    ['an unknown trigger mode', { triggerMode: 'auto' }, /trigger/i],
    ['a zero entry cap', { maxEntriesPerCustomerPerPeriod: 0 }, /limit/i],
    ['a weekly draw with no weekday', { scheduleType: 'recurring', recurrence: { frequency: 'weekly' } }, /weekday/i],
    ['a recurring draw with no frequency', { scheduleType: 'recurring' }, /frequency/i],
  ])('rejects %s', async (_label, patch, message) => {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    await expect(createCampaign(String(merchantId), { ...baseInput(store._id), ...patch })).rejects.toThrow(ValidationError);
    await expect(createCampaign(String(merchantId), { ...baseInput(store._id), ...patch })).rejects.toThrow(message);
  });

  it('rejects stores that belong to another merchant or are inactive', async () => {
    const merchantId = newId();
    const foreign = await seedStore(newId());
    const inactive = await seedStore(merchantId, { status: 'inactive' });
    await expect(createCampaign(String(merchantId), baseInput(foreign._id))).rejects.toThrow(/not available/);
    await expect(createCampaign(String(merchantId), baseInput(inactive._id))).rejects.toThrow(/not available/);
  });
});

describe('createCampaign: prizes tied to bill ranges', () => {
  const TV = { prizeDescription: 'Smart TV', prizeValue: 30000 };
  const PHONE = { prizeDescription: 'Smart Phone', prizeValue: 9000 };

  async function setup() {
    const merchantId = newId();
    const store = await seedStore(merchantId);
    return { merchantId: String(merchantId), store };
  }

  it('defaults to shared prizes and ignores range choices in that mode', async () => {
    const { merchantId, store } = await setup();
    const campaign = await createCampaign(merchantId, { ...baseInput(store._id), prizes: [{ ...TV, tierIndexes: [1] }, PHONE] });
    expect(campaign.prizeMode).toBe('shared');
    expect(campaign.prizeTiers.map((p) => p.tierIndexes)).toEqual([[], []]);
  });

  it('pool per range: each prize belongs to one range', async () => {
    const { merchantId, store } = await setup();
    const campaign = await createCampaign(merchantId, {
      ...baseInput(store._id), prizeMode: 'pool_per_tier', prizes: [{ ...TV, tierIndexes: [1] }, { ...PHONE, tierIndexes: [0] }],
    });
    expect(campaign.prizeMode).toBe('pool_per_tier');
    expect(campaign.prizeTiers.map((p) => [p.rank, p.prizeDescription, p.tierIndexes])).toEqual([[1, 'Smart TV', [1]], [2, 'Smart Phone', [0]]]);
  });

  it('restricted: a prize can be limited to some ranges, or open to all', async () => {
    const { merchantId, store } = await setup();
    const campaign = await createCampaign(merchantId, {
      ...baseInput(store._id), prizeMode: 'restricted', prizes: [{ ...TV, tierIndexes: [1] }, PHONE],
    });
    expect(campaign.prizeTiers.map((p) => p.tierIndexes)).toEqual([[1], []]);
  });

  it('stores ranges sorted by minimum, and range numbers refer to that sorted order', async () => {
    const { merchantId, store } = await setup();
    const campaign = await createCampaign(merchantId, {
      ...baseInput(store._id),
      entryTiers: [{ minAmount: 1000, maxAmount: null, entriesGranted: 3 }, { minAmount: 500, maxAmount: 1000, entriesGranted: 1 }],
      prizeMode: 'pool_per_tier',
      prizes: [{ ...TV, tierIndexes: [1] }, { ...PHONE, tierIndexes: [0] }],
    });
    expect(campaign.entryTiers.map((t) => t.minAmount)).toEqual([500, 1000]);
    expect(campaign.prizeTiers[0].tierIndexes).toEqual([1]);
  });

  it.each([
    ['an unknown mode', { prizeMode: 'weird', prizes: [TV, PHONE] }, /how prizes are split/i],
    ['a pool prize with no range', { prizeMode: 'pool_per_tier', prizes: [TV, { ...PHONE, tierIndexes: [0] }] }, /exactly one/i],
    ['a range with no prize', { prizeMode: 'pool_per_tier', prizes: [{ ...TV, tierIndexes: [1] }, { ...PHONE, tierIndexes: [1] }] }, /every entry range needs/i],
    ['a restricted set that leaves a range unable to win', { prizeMode: 'restricted', prizes: [{ ...TV, tierIndexes: [1] }, { ...PHONE, tierIndexes: [1] }] }, /must be able to win/i],
    ['a prize pointing at a missing range', { prizeMode: 'restricted', prizes: [{ ...TV, tierIndexes: [7] }, PHONE] }, /does not exist/i],
    ['tying prizes to ranges with only one range', { prizeMode: 'restricted', entryTiers: [{ minAmount: 0, maxAmount: null, entriesGranted: 1 }], prizes: [{ ...TV, tierIndexes: [0] }, PHONE] }, /at least two/i],
  ])('rejects %s', async (_label, patch, message) => {
    const { merchantId, store } = await setup();
    await expect(createCampaign(merchantId, { ...baseInput(store._id), ...patch })).rejects.toThrow(ValidationError);
    await expect(createCampaign(merchantId, { ...baseInput(store._id), ...patch })).rejects.toThrow(message);
  });
});

describe('setCampaignStatus', () => {
  async function draftCampaign(merchantId, overrides = {}) {
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
