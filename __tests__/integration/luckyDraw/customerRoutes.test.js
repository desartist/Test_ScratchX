jest.mock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: true }));
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn().mockResolvedValue({ success: true }) };
});

import Account from '@/models/accountModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';
import { GET as getCampaignInfo } from '@/app/api/customer/lucky-draw/campaigns/[id]/route';
import { POST as participate } from '@/app/api/customer/lucky-draw/participate/route';
import { POST as entryStatus } from '@/app/api/customer/lucky-draw/status/route';
import { createCampaign, createOpenDraw, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => sendSms.mockClear());

const post = (url, body) =>
  new Request(`http://localhost${url}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const entryBody = (campaign, overrides = {}) => ({
  campaignId: String(campaign._id),
  customerName: 'Asha Verma',
  customerMobile: '9876543210',
  customerEmail: 'asha@example.com',
  billAmount: 1200,
  consent: true,
  latitude: 19.0772,
  longitude: 72.8785,
  ...overrides,
});

describe('GET /api/customer/lucky-draw/campaigns/:id', () => {
  it('returns what a customer needs, and nothing internal', async () => {
    const campaign = await createCampaign();
    await createOpenDraw(campaign);

    const res = await getCampaignInfo(new Request('http://localhost/x'), { params: Promise.resolve({ id: String(campaign._id) }) });
    const { data } = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      name: campaign.name,
      isOpen: true,
      requiresLocation: true,
      notice: DATE_CHANGE_NOTICE,
      prizes: [
        { rank: 1, prizeDescription: 'Smart TV' },
        { rank: 2, prizeDescription: 'Mixer Grinder' },
      ],
      // The store id is public: a store's own QR carries it as ?store=.
      stores: [{ storeId: String(campaign.assignedStores[0].storeId), storeName: 'Main Store', city: 'Mumbai' }],
    });
    expect(data.drawDate).toBeTruthy();
    const text = JSON.stringify(data);
    expect(text).not.toContain(String(campaign.merchantId));
  });

  it('says how the draw runs, the minimum bill and the prize levels', async () => {
    const campaign = await createCampaign({ drawType: 'live_online', minBillAmount: 1000 });
    const res = await getCampaignInfo(new Request('http://localhost/x'), { params: Promise.resolve({ id: String(campaign._id) }) });
    const { data } = await res.json();
    expect(data).toMatchObject({ drawType: 'live_online', takesQrEntries: true, minBillAmount: 1000 });
    expect(data.prizes).toEqual([
      { rank: 1, level: 'Grand Prize', prizeDescription: 'Smart TV', prizeValue: 30000, quantity: 1, imageUrl: null },
      { rank: 2, level: 'Second Prize', prizeDescription: 'Mixer Grinder', prizeValue: 3000, quantity: 1, imageUrl: null },
    ]);
    for (const key of ['entryTiers', 'prizeMode', 'revealMode', 'maxEntriesPerCustomerPerPeriod']) expect(data).not.toHaveProperty(key);
  });

  it('says a physical draw takes no QR entries', async () => {
    const campaign = await createCampaign({ drawType: 'physical' });
    const res = await getCampaignInfo(new Request('http://localhost/x'), { params: Promise.resolve({ id: String(campaign._id) }) });
    expect((await res.json()).data.takesQrEntries).toBe(false);
  });

  it('marks paused or ended campaigns as not open', async () => {
    const campaign = await createCampaign({ status: 'paused' });
    const res = await getCampaignInfo(new Request('http://localhost/x'), { params: Promise.resolve({ id: String(campaign._id) }) });
    expect((await res.json()).data.isOpen).toBe(false);
  });

  it('does not require GPS for wholesale merchants', async () => {
    const campaign = await createCampaign();
    await Account.collection.insertOne({ _id: campaign.merchantId, role: 'Merchant', profile: { businessModel: 'Wholesale' } });
    const res = await getCampaignInfo(new Request('http://localhost/x'), { params: Promise.resolve({ id: String(campaign._id) }) });
    expect((await res.json()).data.requiresLocation).toBe(false);
  });

  it('answers 404 for unknown and malformed ids', async () => {
    for (const id of [String(newId()), 'nope']) {
      const res = await getCampaignInfo(new Request('http://localhost/x'), { params: Promise.resolve({ id }) });
      expect(res.status).toBe(404);
    }
  });
});

describe('POST /api/customer/lucky-draw/participate', () => {
  it('records the entry, texts a confirmation with the notice, and returns the totals', async () => {
    const campaign = await createCampaign();

    const res = await participate(post('/api/customer/lucky-draw/participate', entryBody(campaign)));
    const { data } = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ entryNumber: 1, entriesGranted: 1, totalEntries: 1, campaignName: campaign.name, confirmationSent: true });
    expect(data.notice).toBe(DATE_CHANGE_NOTICE);
    expect(data.entry).toBeUndefined();
    expect(sendSms).toHaveBeenCalledTimes(1);
    expect(sendSms.mock.calls[0][0]).toBe('9876543210');
    expect(sendSms.mock.calls[0][1]).toContain(DATE_CHANGE_NOTICE);
  });

  it('does not text again for a second entry within ten minutes', async () => {
    const campaign = await createCampaign();
    await participate(post('/x', entryBody(campaign, { billAmount: 1200 })));
    const second = await participate(post('/x', entryBody(campaign, { billAmount: 1300 })));
    expect((await second.json()).data).toMatchObject({ totalEntries: 2, confirmationSent: false });
    expect(sendSms).toHaveBeenCalledTimes(1);
  });

  it('still records the entry when the SMS provider fails', async () => {
    sendSms.mockRejectedValueOnce(new Error('Twilio error: down'));
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const campaign = await createCampaign();
    const res = await participate(post('/x', entryBody(campaign)));
    expect(res.status).toBe(201);
    expect((await res.json()).data.confirmationSent).toBe(false);
    errors.mockRestore();
  });

  it('skips the GPS check for wholesale merchants', async () => {
    const campaign = await createCampaign();
    await Account.collection.insertOne({ _id: campaign.merchantId, role: 'Merchant', profile: { businessModel: 'Wholesale' } });
    const res = await participate(post('/x', entryBody(campaign, { latitude: undefined, longitude: undefined })));
    expect(res.status).toBe(201);
  });

  it.each([
    ['too far away', { latitude: 28.6139, longitude: 77.209 }, 400],
    ['a negative bill', { billAmount: -1 }, 400],
    ['no consent', { consent: false }, 400],
    ['a bad mobile', { customerMobile: '123' }, 400],
    ['a bill below the minimum', { billAmount: 10 }, 400],
  ])('rejects %s with %i', async (_label, patch, status) => {
    const campaign = await createCampaign({ minBillAmount: 100 });
    const res = await participate(post('/x', entryBody(campaign, patch)));
    expect(res.status).toBe(status);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('answers 409 for a duplicate submission and a closed campaign, 404 for an unknown one', async () => {
    const campaign = await createCampaign();
    await participate(post('/x', entryBody(campaign)));
    expect((await participate(post('/x', entryBody(campaign)))).status).toBe(409);

    const paused = await createCampaign({ status: 'paused' });
    expect((await participate(post('/x', entryBody(paused)))).status).toBe(409);

    expect((await participate(post('/x', entryBody({ _id: newId() })))).status).toBe(404);
  });

  it('passes the store QR and the GPS accuracy through to the geofence', async () => {
    const pune = { storeId: newId(), storeName: 'Pune', city: 'Pune', latitude: 18.5204, longitude: 73.8567, status: 'active' };
    const campaign = await createCampaign({ assignedStores: [{ storeId: newId(), storeName: 'Mumbai', city: 'Mumbai', latitude: 19.076, longitude: 72.8777, status: 'active' }, pune] });
    const at350m = { latitude: 18.5204 + 350 / 111320, longitude: 73.8567 };

    const tooFar = await participate(post('/x', entryBody(campaign, { ...at350m, storeId: String(pune.storeId) })));
    expect(tooFar.status).toBe(400);
    expect((await tooFar.json()).error).toMatch(/about 350m away .* within 250m/);

    const widened = await participate(post('/x', entryBody(campaign, { ...at350m, accuracy: 120, storeId: String(pune.storeId), customerMobile: '9876511111' })));
    expect(widened.status).toBe(201);
    const entry = await LuckyDrawEntry.findOne({ customerPhone: '9876511111' }).lean();
    expect(String(entry.storeId)).toBe(String(pune.storeId));

    const wrongStore = await participate(post('/x', entryBody(campaign, { storeId: String(newId()), customerMobile: '9876522222' })));
    expect(wrongStore.status).toBe(400);
    expect((await wrongStore.json()).error).toBe('This QR code is not for a store in this draw.');
  });

  it('answers 409 for a QR entry into a physical draw', async () => {
    const campaign = await createCampaign({ drawType: 'physical' });
    expect((await participate(post('/x', entryBody(campaign)))).status).toBe(409);
  });

  it('rejects a body that is not JSON', async () => {
    const res = await participate(new Request('http://localhost/x', { method: 'POST', body: 'nope' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/customer/lucky-draw/status', () => {
  it('shows the current draw date, the previous one and the customer\'s entries', async () => {
    const campaign = await createCampaign();
    await participate(post('/x', entryBody(campaign)));

    const res = await entryStatus(post('/api/customer/lucky-draw/status', { campaignId: String(campaign._id), customerMobile: '9876543210' }));
    const { data } = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({ campaignName: campaign.name, totalEntries: 1, drawStatus: 'scheduled', notice: DATE_CHANGE_NOTICE });
    expect(data.drawDate).toBeTruthy();
  });

  it('never returns a claim code, even for a winner', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign, { status: 'completed' });
    await LuckyDrawWinner.create({
      drawId: draw._id,
      campaignId: campaign._id,
      merchantId: campaign.merchantId,
      rank: 1,
      entryId: newId(),
      customerName: 'Asha Verma',
      customerPhone: '9876543210',
      prizeDescription: 'Smart TV',
      claimCode: 'TOPSECR3',
      status: 'notified',
      expiresAt: new Date(Date.now() + DAY),
    });

    const res = await entryStatus(post('/x', { campaignId: String(campaign._id), customerMobile: '9876543210' }));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toContain('Smart TV');
    expect(text).not.toContain('TOPSECR3');
    expect(text.toLowerCase()).not.toContain('claimcode');
  });

  it('answers 400 for a bad mobile and 404 for an unknown campaign', async () => {
    const campaign = await createCampaign();
    expect((await entryStatus(post('/x', { campaignId: String(campaign._id), customerMobile: '123' }))).status).toBe(400);
    expect((await entryStatus(post('/x', { campaignId: String(newId()), customerMobile: '9876543210' }))).status).toBe(404);
  });
});
