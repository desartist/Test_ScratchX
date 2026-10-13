jest.mock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: true }));
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn().mockResolvedValue({ success: true }) };
});

import LuckyDraw from '@/models/luckyDrawModel';
import { requireAuth } from '@/lib/auth';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { GET as listEntriesRoute, POST as addEntryRoute } from '@/app/api/lucky-draws/campaigns/[id]/entries/route';
import { GET as staffDrawsRoute } from '@/app/api/lucky-draws/staff/draws/route';
import { POST as picksRoute } from '@/app/api/lucky-draws/draws/[drawId]/picks/route';
import { createCampaign, createOpenDraw, createEntry, nextPhone, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => sendSms.mockClear());

const as = (account) => requireAuth.mockResolvedValue({ account, error: null });
const req = (method, url, body) =>
  new Request(`http://localhost${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const params = (p) => ({ params: Promise.resolve(p) });
const body = { customerName: 'Ravi Kumar', customerMobile: '9811111111', billAmount: 1500, consent: true };

describe('staff entries', () => {
  it('lets the merchant add an entry, texts the customer and lists it', async () => {
    const campaign = await createCampaign({ drawType: 'physical' });
    as({ _id: campaign.merchantId, role: 'Merchant' });

    const res = await addEntryRoute(req('POST', '/x', body), params({ id: String(campaign._id) }));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toMatchObject({ entryNumber: 1, totalEntries: 1, storeName: 'Main Store', confirmationSent: true });
    expect(sendSms).toHaveBeenCalledTimes(1);

    const list = await listEntriesRoute(req('GET', `/x?q=ravi`), params({ id: String(campaign._id) }));
    expect((await list.json()).data.entries.map((e) => e.entryNumber)).toEqual([1]);
  });

  it('answers 409 for a digital draw, 400 below the minimum and 403 for other roles', async () => {
    const digital = await createCampaign({ drawType: 'digital' });
    as({ _id: digital.merchantId, role: 'Merchant' });
    expect((await addEntryRoute(req('POST', '/x', body), params({ id: String(digital._id) }))).status).toBe(409);

    const physical = await createCampaign({ drawType: 'physical', minBillAmount: 2000 });
    as({ _id: physical.merchantId, role: 'Merchant' });
    expect((await addEntryRoute(req('POST', '/x', body), params({ id: String(physical._id) }))).status).toBe(400);

    as({ _id: newId(), role: 'Distributor' });
    expect((await addEntryRoute(req('POST', '/x', body), params({ id: String(physical._id) }))).status).toBe(403);
  });

  it('keeps the entry list to the owner', async () => {
    const campaign = await createCampaign({ drawType: 'physical' });
    as({ _id: newId(), role: 'Store_Staff', storeId: campaign.assignedStores[0].storeId });
    expect((await listEntriesRoute(req('GET', '/x'), params({ id: String(campaign._id) }))).status).toBe(403);
  });

  it('lists open draws for the merchant too', async () => {
    const campaign = await createCampaign({ drawType: 'live_online', name: 'Navratri' });
    as({ _id: campaign.merchantId, role: 'Merchant' });
    const res = await staffDrawsRoute(req('GET', '/x'));
    expect(res.status).toBe(200);
    expect((await res.json()).data.map((d) => d.name)).toEqual(['Navratri']);
  });
});

describe('picking physical winners', () => {
  it('saves the picks for the owner and refuses store staff', async () => {
    const campaign = await createCampaign({ drawType: 'physical', startDate: new Date(Date.now() - 5 * DAY), endDate: new Date(Date.now() - 1000) });
    const draw = await createOpenDraw(campaign);
    const a = await createEntry(campaign, draw, { customerPhone: nextPhone() });
    const b = await createEntry(campaign, draw, { customerPhone: nextPhone() });
    const picks = [{ rank: 1, entryId: String(a._id) }, { rank: 2, entryId: String(b._id) }];

    as({ _id: newId(), role: 'Store_Staff' });
    expect((await picksRoute(req('POST', '/x', { picks }), params({ drawId: String(draw._id) }))).status).toBe(403);

    as({ _id: campaign.merchantId, role: 'Merchant' });
    const res = await picksRoute(req('POST', '/x', { picks }), params({ drawId: String(draw._id) }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.winners).toHaveLength(2);
    expect((await picksRoute(req('POST', '/x', { picks }), params({ drawId: String(draw._id) }))).status).toBe(409);
  });
});
