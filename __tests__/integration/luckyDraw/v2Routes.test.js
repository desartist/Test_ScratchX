jest.mock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: true }));
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/subscriptionAccessGuard', () => ({ checkPlanAccess: jest.fn() }));
jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn().mockResolvedValue({ success: true }) };
});

import LuckyDraw from '@/models/luckyDrawModel';
import { requireAuth } from '@/lib/auth';
import { checkPlanAccess } from '@/lib/subscriptionAccessGuard';
import { PATCH as patchDates } from '@/app/api/lucky-draws/campaigns/[id]/dates/route';
import { POST as startReveal } from '@/app/api/lucky-draws/draws/[drawId]/reveal/start/route';
import { POST as nextReveal } from '@/app/api/lucky-draws/draws/[drawId]/reveal/next/route';
import { PATCH as claim } from '@/app/api/lucky-draws/winners/[winnerId]/claim/route';
import { GET as publicReveal } from '@/app/api/customer/lucky-draw/campaigns/[id]/reveal/route';
import { GET as publicCampaign } from '@/app/api/customer/lucky-draw/campaigns/[id]/route';
import { POST as participate } from '@/app/api/customer/lucky-draw/participate/route';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { createCampaign, createOpenDraw, createEntry, nextPhone, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  checkPlanAccess.mockReset();
  checkPlanAccess.mockResolvedValue({ allowed: true, plan: { limits: { maxCampaigns: 10 } } });
});

const as = (role, id = newId()) => requireAuth.mockResolvedValue({ account: { _id: id, role }, error: null });
const req = (method, url, body) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (p) => ({ params: Promise.resolve(p) });
const json = async (res) => (await res.json()).data;

const categories = [
  { rank: 1, prizeDescription: 'Grand prize', prizeValue: 8000, quantity: 1, imageUrl: 'data:image/jpeg;base64,AAAA' },
  { rank: 2, prizeDescription: 'Third prize', prizeValue: 1000, quantity: 2 },
];

async function qrDraw(drawType, { closed = true } = {}) {
  const endDate = closed ? new Date(Date.now() - DAY) : new Date(Date.now() + 5 * DAY);
  const campaign = await createCampaign({
    drawType,
    prizeTiers: categories,
    startDate: new Date(endDate.getTime() - 10 * DAY),
    endDate,
    revealDate: endDate,
  });
  const draw = await createOpenDraw(campaign, { drawDate: endDate });
  for (let i = 0; i < 5; i += 1) await createEntry(campaign, draw, { customerName: 'Kunal Desai', customerPhone: nextPhone() });
  return { campaign, draw, merchantId: campaign.merchantId };
}

describe('merchant-only routes', () => {
  it('answer 403 to store staff', async () => {
    as('Store_Staff');
    const p = params({ id: String(newId()), drawId: String(newId()), winnerId: String(newId()) });
    for (const res of [
      await patchDates(req('PATCH', '/x', {}), p),
      await startReveal(req('POST', '/x'), p),
      await nextReveal(req('POST', '/x'), p),
      await claim(req('PATCH', '/x', {}), p),
    ]) {
      expect(res.status).toBe(403);
    }
  });
});

describe('live reveal from QR entries', () => {
  it('starts without exposing winners, reveals one prize at a time, and the owner can mark a claim', async () => {
    const { campaign, draw, merchantId } = await qrDraw('live_online');
    as('Merchant', merchantId);

    const started = await startReveal(req('POST', '/x'), params({ drawId: String(draw._id) }));
    expect(started.status).toBe(200);
    const startBody = await json(started);
    expect(startBody.winnerCount).toBe(3);
    expect(startBody.winners).toBeUndefined();

    let view = await json(await publicReveal(req('GET', '/x'), params({ id: String(campaign._id) })));
    expect(view.status).toBe('live');
    expect(view.drawType).toBe('live_online');
    expect(view.categories.every((c) => c.winners.length === 0)).toBe(true);

    await nextReveal(req('POST', '/x'), params({ drawId: String(draw._id) }));
    view = await json(await publicReveal(req('GET', '/x'), params({ id: String(campaign._id) })));
    expect(view.categories[0]).toMatchObject({ name: 'Third prize', revealed: true });
    expect(view.categories[0].winners.map((w) => w.label)).toEqual(['Kunal D.', 'Kunal D.']);
    expect(JSON.stringify(view)).not.toMatch(/claimCode|customerPhone/);

    const revealed = await LuckyDrawWinner.findOne({ drawId: draw._id, rank: 2 }).lean();
    const claimed = await claim(req('PATCH', '/x', {}), params({ winnerId: String(revealed._id) }));
    expect(claimed.status).toBe(200);
    expect((await json(claimed)).status).toBe('redeemed');

    // The grand prize is still hidden, so even the owner cannot mark it yet.
    const hidden = await LuckyDrawWinner.findOne({ drawId: draw._id, rank: 1 }).lean();
    expect((await claim(req('PATCH', '/x', {}), params({ winnerId: String(hidden._id) }))).status).toBe(404);
  });

  it('refuses to start a reveal for a draw that shows winners at once', async () => {
    const { draw, merchantId } = await qrDraw('digital');
    as('Merchant', merchantId);
    const res = await startReveal(req('POST', '/x'), params({ drawId: String(draw._id) }));
    expect(res.status).toBe(409);
  });
});

describe('extending dates', () => {
  it('extends entries close for the owner and 404s for anyone else', async () => {
    const { campaign, merchantId } = await qrDraw('live_online', { closed: false });
    as('Merchant', merchantId);
    const newDate = new Date(new Date(campaign.endDate).getTime() + 7 * DAY).toISOString();

    const res = await patchDates(req('PATCH', '/x', { target: 'entries_close', newDate }), params({ id: String(campaign._id) }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.revealMoved).toBe(true);
    expect(body.campaign.endDate).toBe(newDate);

    as('Merchant');
    const other = await patchDates(req('PATCH', '/x', { target: 'entries_close', newDate }), params({ id: String(campaign._id) }));
    expect(other.status).toBe(404);
  });
});

describe('public pages', () => {
  it('shows prize images, values and how winners are shown, and takes QR entries for a live reveal', async () => {
    const { campaign } = await qrDraw('live_online', { closed: false });

    const info = await json(await publicCampaign(req('GET', '/x'), params({ id: String(campaign._id) })));
    expect(info.drawType).toBe('live_online');
    expect(info.prizes[0]).toMatchObject({ prizeDescription: 'Grand prize', prizeValue: 8000, quantity: 1 });
    expect(info.prizes[0].imageUrl).toMatch(/^data:image/);

    const entry = await participate(
      req('POST', '/x', {
        campaignId: String(campaign._id),
        customerName: 'Asha',
        customerMobile: '9876543210',
        customerEmail: 'asha@example.com',
        billAmount: 5000,
        consent: true,
        latitude: 19.0772,
        longitude: 72.8785,
      }),
    );
    expect(entry.status).toBe(201);
  });
});
