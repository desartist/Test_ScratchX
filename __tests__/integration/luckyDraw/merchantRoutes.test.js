jest.mock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: true }));
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/subscriptionAccessGuard', () => ({ checkPlanAccess: jest.fn() }));
jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn().mockResolvedValue({ success: true }) };
});

import Store from '@/models/storeModel';
import Account from '@/models/accountModel';
import LuckyDraw from '@/models/luckyDrawModel';
import { requireAuth } from '@/lib/auth';
import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { GET as listCampaigns, POST as createCampaign } from '@/app/api/lucky-draws/campaigns/route';
import { GET as getCampaign } from '@/app/api/lucky-draws/campaigns/[id]/route';
import { PATCH as patchStatus } from '@/app/api/lucky-draws/campaigns/[id]/status/route';
import { GET as getQr } from '@/app/api/lucky-draws/campaigns/[id]/qr/route';
import { POST as runDrawRoute } from '@/app/api/lucky-draws/draws/[drawId]/run/route';
import { PATCH as patchDate } from '@/app/api/lucky-draws/draws/[drawId]/date/route';
import { POST as redeem } from '@/app/api/lucky-draws/redeem/route';
import { createCampaign as makeCampaign, createOpenDraw, createEntry, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockClear();
  checkPlanAccess.mockReset();
  checkPlanAccess.mockResolvedValue({ allowed: true, plan: { limits: { maxCampaigns: 10 } } });
});

const as = (role, id = newId(), extra = {}) =>
  requireAuth.mockResolvedValue({ account: { _id: id, role, ...extra }, error: null });
const anonymous = () =>
  requireAuth.mockResolvedValue({
    account: null,
    error: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
  });

const req = (method, url, body) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (p) => ({ params: Promise.resolve(p) });

let storeSeq = 0;
async function seedStore(merchantId) {
  // createMockStore derives store_code from Date.now(); two stores in one millisecond collide on the unique index.
  const store = global.createMockStore(merchantId, { store_code: `LD${++storeSeq}` });
  await Store.collection.insertOne(store);
  return store;
}

const newCampaignBody = () => ({
  drawType: 'digital',
  name: 'Diwali Lucky Draw',
  startDate: new Date(Date.now() - DAY).toISOString(),
  endDate: new Date(Date.now() + 30 * DAY).toISOString(),
  minBillAmount: 0,
  prizes: [
    { rank: 1, prizeDescription: 'Smart TV', prizeValue: 30000, quantity: 1 },
    { rank: 2, prizeDescription: 'Mixer', prizeValue: 2000, quantity: 1 },
    { rank: 3, prizeDescription: 'Voucher', prizeValue: 500, quantity: 2 },
  ],
});

describe('authentication and roles', () => {
  it('answers 401 to anonymous callers and 403 to non-merchants', async () => {
    anonymous();
    expect((await listCampaigns()).status).toBe(401);
    as('Manager');
    expect((await listCampaigns()).status).toBe(403);
    as('Store_Staff');
    expect((await createCampaign(req('POST', '/api/lucky-draws/campaigns', {}))).status).toBe(403);
  });
});

describe('campaigns', () => {
  it('creates, lists and shows a campaign for its owner', async () => {
    const merchantId = newId();
    as('Merchant', merchantId);
    const store = await seedStore(merchantId);

    const created = await createCampaign(req('POST', '/api/lucky-draws/campaigns', newCampaignBody()));
    expect(created.status).toBe(201);
    const { data } = await created.json();
    expect(data.status).toBe('draft');

    const list = await (await listCampaigns()).json();
    expect(list.data.map((c) => c.name)).toEqual(['Diwali Lucky Draw']);

    const detail = await getCampaign(req('GET', `/api/lucky-draws/campaigns/${data._id}`), params({ id: data._id }));
    expect(detail.status).toBe(200);
    expect((await detail.json()).data.campaign._id).toBe(data._id);
  });

  it('turns validation problems into 400 and plan problems into 403', async () => {
    const merchantId = newId();
    as('Merchant', merchantId);
    const store = await seedStore(merchantId);

    const bad = await createCampaign(req('POST', '/api/lucky-draws/campaigns', { ...newCampaignBody(), prizes: [] }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/prize/i);

    checkPlanAccess.mockResolvedValue({ allowed: false, reason: 'This feature is not available in the Core plan' });
    const denied = await createCampaign(req('POST', '/api/lucky-draws/campaigns', newCampaignBody()));
    expect(denied.status).toBe(403);
  });

  it('rejects a body that is not JSON', async () => {
    as('Merchant');
    const res = await createCampaign(new Request('http://localhost/api/lucky-draws/campaigns', { method: 'POST', body: 'not json' }));
    expect(res.status).toBe(400);
  });

  it('hides other merchants\' campaigns and malformed ids behind 404', async () => {
    const campaign = await makeCampaign();
    as('Merchant');
    const other = await getCampaign(req('GET', '/x'), params({ id: String(campaign._id) }));
    expect(other.status).toBe(404);
    const bad = await getCampaign(req('GET', '/x'), params({ id: 'nope' }));
    expect(bad.status).toBe(404);
  });

  it('activates and pauses through the status route, rejecting unknown statuses', async () => {
    const campaign = await makeCampaign({ status: 'draft' });
    await seedStore(campaign.merchantId);
    as('Merchant', campaign.merchantId);
    const id = String(campaign._id);

    const activated = await patchStatus(req('PATCH', '/x', { status: 'active' }), params({ id }));
    expect(activated.status).toBe(200);
    expect((await activated.json()).data.status).toBe('active');

    const again = await patchStatus(req('PATCH', '/x', { status: 'active' }), params({ id }));
    expect(again.status).toBe(409);

    const bad = await patchStatus(req('PATCH', '/x', { status: 'ended' }), params({ id }));
    expect(bad.status).toBe(400);

    const paused = await patchStatus(req('PATCH', '/x', { status: 'paused' }), params({ id }));
    expect(paused.status).toBe(200);
  });

  it('returns a QR code pointing at the public entry page', async () => {
    const campaign = await makeCampaign();
    as('Merchant', campaign.merchantId);
    const res = await getQr(req('GET', `/api/lucky-draws/campaigns/${campaign._id}/qr`), params({ id: String(campaign._id) }));
    const { data } = await res.json();
    expect(res.status).toBe(200);
    expect(data.url).toBe(`http://localhost/lucky-draw/${campaign._id}`);
    expect(data.dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('running a draw', () => {
  it('lets the owner run it once; a second run is a 409', async () => {
    const campaign = await makeCampaign();
    const draw = await createOpenDraw(campaign);
    await createEntry(campaign, draw);
    as('Merchant', campaign.merchantId);

    const first = await runDrawRoute(req('POST', '/x'), params({ drawId: String(draw._id) }));
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.data.draw.status).toBe('completed');
    expect(body.data.draw.triggeredBy.source).toBe('manual');
    expect(body.data.winners).toHaveLength(1);

    const second = await runDrawRoute(req('POST', '/x'), params({ drawId: String(draw._id) }));
    expect(second.status).toBe(409);
  });

  it('refuses other merchants (404) and non-merchants (403)', async () => {
    const campaign = await makeCampaign();
    const draw = await createOpenDraw(campaign);
    as('Merchant');
    expect((await runDrawRoute(req('POST', '/x'), params({ drawId: String(draw._id) }))).status).toBe(404);
    as('Manager', campaign.merchantId);
    expect((await runDrawRoute(req('POST', '/x'), params({ drawId: String(draw._id) }))).status).toBe(403);
    expect((await LuckyDraw.findById(draw._id)).status).toBe('scheduled');
  });

  it('answers 409 for a physical or live online draw and creates no winners', async () => {
    for (const drawType of ['physical', 'live_online']) {
      const campaign = await makeCampaign({ drawType });
      const draw = await createOpenDraw(campaign);
      await createEntry(campaign, draw);
      as('Merchant', campaign.merchantId);
      const res = await runDrawRoute(req('POST', '/x'), params({ drawId: String(draw._id) }));
      expect(res.status).toBe(409);
      expect((await LuckyDraw.findById(draw._id)).status).toBe('scheduled');
    }
  });
});

describe('changing the draw date', () => {
  it('moves the date for the owner without texting anyone by default', async () => {
    const campaign = await makeCampaign();
    const draw = await createOpenDraw(campaign);
    await createEntry(campaign, draw);
    as('Merchant', campaign.merchantId);
    const newDate = new Date(Date.now() + 20 * DAY).toISOString();

    const res = await patchDate(req('PATCH', '/x', { drawDate: newDate, reason: 'Low sales' }), params({ drawId: String(draw._id) }));

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(new Date(data.draw.drawDate).toISOString()).toBe(newDate);
    expect(data.draw.dateHistory[0].reason).toBe('Low sales');
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('texts entrants only when notifyEntrants is true', async () => {
    const campaign = await makeCampaign();
    const draw = await createOpenDraw(campaign);
    await createEntry(campaign, draw);
    as('Merchant', campaign.merchantId);

    const res = await patchDate(
      req('PATCH', '/x', { drawDate: new Date(Date.now() + 20 * DAY).toISOString(), notifyEntrants: true }),
      params({ drawId: String(draw._id) }),
    );

    expect((await res.json()).data).toMatchObject({ entrantCount: 1, notifiedCount: 1 });
    expect(sendSms).toHaveBeenCalledTimes(1);
  });

  it('only lets the store owner change it', async () => {
    const campaign = await makeCampaign();
    const draw = await createOpenDraw(campaign);
    const body = { drawDate: new Date(Date.now() + 20 * DAY).toISOString() };

    as('Manager', campaign.merchantId);
    expect((await patchDate(req('PATCH', '/x', body), params({ drawId: String(draw._id) }))).status).toBe(403);
    as('Merchant');
    expect((await patchDate(req('PATCH', '/x', body), params({ drawId: String(draw._id) }))).status).toBe(404);
    expect((await LuckyDraw.findById(draw._id)).dateHistory).toHaveLength(0);
  });

  it('answers 400 for a past date and 409 once the draw has run', async () => {
    const campaign = await makeCampaign();
    const draw = await createOpenDraw(campaign);
    as('Merchant', campaign.merchantId);

    const past = await patchDate(req('PATCH', '/x', { drawDate: new Date(Date.now() - DAY).toISOString() }), params({ drawId: String(draw._id) }));
    expect(past.status).toBe(400);

    await LuckyDraw.updateOne({ _id: draw._id }, { $set: { status: 'completed' } });
    const done = await patchDate(req('PATCH', '/x', { drawDate: new Date(Date.now() + DAY).toISOString() }), params({ drawId: String(draw._id) }));
    expect(done.status).toBe(409);
  });
});

describe('redeeming', () => {
  async function seedWinnerFor(campaign) {
    const LuckyDrawWinner = (await import('@/models/luckyDrawWinnerModel')).default;
    await LuckyDrawWinner.create({
      drawId: newId(),
      campaignId: campaign._id,
      merchantId: campaign.merchantId,
      rank: 1,
      entryId: newId(),
      customerName: 'Asha Verma',
      customerPhone: '9876543210',
      prizeDescription: 'Smart TV',
      claimCode: 'ABCD2345',
      status: 'notified',
      expiresAt: new Date(Date.now() + DAY),
    });
  }

  it('lets store staff of the merchant redeem a code', async () => {
    const campaign = await makeCampaign();
    await seedWinnerFor(campaign);
    await Account.collection.insertOne({ _id: campaign.merchantId, role: 'Merchant' });
    as('Store_Staff', newId(), { parentId: campaign.merchantId });

    const res = await redeem(req('POST', '/api/lucky-draws/redeem', { claimCode: 'abcd2345' }));

    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ status: 'redeemed', prizeDescription: 'Smart TV' });
  });

  it('refuses distributors, and reports unknown codes as 404', async () => {
    const campaign = await makeCampaign();
    await seedWinnerFor(campaign);
    as('Distributor');
    expect((await redeem(req('POST', '/x', { claimCode: 'ABCD2345' }))).status).toBe(403);
    as('Merchant', campaign.merchantId);
    expect((await redeem(req('POST', '/x', { claimCode: 'ZZZZ9999' }))).status).toBe(404);
    expect((await redeem(req('POST', '/x', {}))).status).toBe(400);
  });
});
