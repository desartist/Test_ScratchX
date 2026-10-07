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
import { PATCH as patchSlips } from '@/app/api/lucky-draws/campaigns/[id]/slips/route';
import { PUT as putPicks } from '@/app/api/lucky-draws/draws/[drawId]/picks/route';
import { POST as publish } from '@/app/api/lucky-draws/draws/[drawId]/publish/route';
import { POST as startReveal } from '@/app/api/lucky-draws/draws/[drawId]/reveal/start/route';
import { POST as nextReveal } from '@/app/api/lucky-draws/draws/[drawId]/reveal/next/route';
import { PATCH as claim } from '@/app/api/lucky-draws/winners/[winnerId]/claim/route';
import { GET as publicReveal } from '@/app/api/customer/lucky-draw/campaigns/[id]/reveal/route';
import { GET as publicCampaign } from '@/app/api/customer/lucky-draw/campaigns/[id]/route';
import { POST as participate } from '@/app/api/customer/lucky-draw/participate/route';
import { createCampaign, createOpenDraw, newId, DAY } from '../../helpers/luckyDrawFixtures';

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

async function slipDraw(distributionMode, { closed = true } = {}) {
  const endDate = closed ? new Date(Date.now() - DAY) : new Date(Date.now() + 5 * DAY);
  const campaign = await createCampaign({
    distributionMode,
    entryTiers: [],
    prizeTiers: categories,
    slipCount: 100,
    startDate: new Date(endDate.getTime() - 10 * DAY),
    endDate,
    revealDate: endDate,
    drawConfig: { scheduleType: 'end_of_campaign', triggerMode: 'manual' },
  });
  const draw = await createOpenDraw(campaign, { drawDate: endDate });
  return { campaign, draw, merchantId: campaign.merchantId };
}

describe('merchant-only routes', () => {
  it('answer 403 to store staff', async () => {
    as('Store_Staff');
    const p = params({ id: String(newId()), drawId: String(newId()), winnerId: String(newId()) });
    for (const res of [
      await patchDates(req('PATCH', '/x', {}), p),
      await patchSlips(req('PATCH', '/x', {}), p),
      await putPicks(req('PUT', '/x', {}), p),
      await publish(req('POST', '/x'), p),
      await startReveal(req('POST', '/x'), p),
      await nextReveal(req('POST', '/x'), p),
      await claim(req('PATCH', '/x', {}), p),
    ]) {
      expect(res.status).toBe(403);
    }
  });
});

describe('in-store reveal', () => {
  it('records slips, saves picks, rejects a duplicate, publishes and shows results', async () => {
    const { campaign, draw, merchantId } = await slipDraw('manual_offline_reveal');
    as('Merchant', merchantId);

    const slips = await patchSlips(req('PATCH', '/x', { slipCount: 150 }), params({ id: String(campaign._id) }));
    expect((await json(slips)).slipCount).toBe(150);

    const dup = await putPicks(
      req('PUT', '/x', { picks: [{ rank: 2, slipNumbers: [7, 7] }] }),
      params({ drawId: String(draw._id) }),
    );
    expect(dup.status).toBe(400);
    expect((await dup.json()).error).toBe('Slip 0007 already won Third prize. Draw another slip.');

    const saved = await putPicks(
      req('PUT', '/x', { picks: [{ rank: 2, slipNumbers: [7, 8] }, { rank: 1, slipNumbers: [99] }] }),
      params({ drawId: String(draw._id) }),
    );
    expect(saved.status).toBe(200);

    const published = await publish(req('POST', '/x'), params({ drawId: String(draw._id) }));
    expect(published.status).toBe(200);
    expect((await json(published)).winners).toHaveLength(3);

    const results = await json(await publicReveal(req('GET', `/x?slip=99`), params({ id: String(campaign._id) })));
    expect(results.status).toBe('done');
    expect(results.mySlip).toMatchObject({ won: true, prize: 'Grand prize' });
    expect(JSON.stringify(results)).not.toMatch(/claimCode/);
  });
});

describe('online reveal of slips', () => {
  it('starts without exposing winners, reveals one category at a time, and the owner can mark a claim', async () => {
    const { campaign, draw, merchantId } = await slipDraw('manual_online_reveal');
    as('Merchant', merchantId);

    const started = await startReveal(req('POST', '/x'), params({ drawId: String(draw._id) }));
    expect(started.status).toBe(200);
    const startBody = await json(started);
    expect(startBody.winnerCount).toBe(3);
    expect(startBody.winners).toBeUndefined();

    let view = await json(await publicReveal(req('GET', '/x'), params({ id: String(campaign._id) })));
    expect(view.status).toBe('live');
    expect(view.categories.every((c) => c.winners.length === 0)).toBe(true);

    await nextReveal(req('POST', '/x'), params({ drawId: String(draw._id) }));
    view = await json(await publicReveal(req('GET', '/x'), params({ id: String(campaign._id) })));
    expect(view.categories[0]).toMatchObject({ name: 'Third prize', revealed: true });
    expect(view.categories[0].winners).toHaveLength(2);

    const winners = await (await import('@/models/luckyDrawWinnerModel')).default.find({ drawId: draw._id }).lean();
    const claimed = await claim(
      req('PATCH', '/x', { customerName: 'Kunal Desai', customerPhone: '9876500000' }),
      params({ winnerId: String(winners[0]._id) }),
    );
    expect(claimed.status).toBe(200);
    expect((await json(claimed)).status).toBe('redeemed');
  });
});

describe('extending dates', () => {
  it('extends entries close for the owner and 404s for anyone else', async () => {
    const { campaign, merchantId } = await slipDraw('manual_offline_reveal', { closed: false });
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
  it('shows prize images, values and the mode, and refuses online entry for slip draws', async () => {
    const { campaign } = await slipDraw('manual_online_reveal', { closed: false });

    const info = await json(await publicCampaign(req('GET', '/x'), params({ id: String(campaign._id) })));
    expect(info.distributionMode).toBe('manual_online_reveal');
    expect(info.prizes[0]).toMatchObject({ prizeDescription: 'Grand prize', prizeValue: 8000, quantity: 1 });
    expect(info.prizes[0].imageUrl).toMatch(/^data:image/);

    const entry = await participate(
      req('POST', '/x', {
        campaignId: String(campaign._id),
        customerName: 'Asha',
        customerMobile: '9876543210',
        billAmount: 5000,
        consent: true,
      }),
    );
    expect(entry.status).toBe(409);
    expect((await entry.json()).error).toMatch(/slip/i);
  });
});
