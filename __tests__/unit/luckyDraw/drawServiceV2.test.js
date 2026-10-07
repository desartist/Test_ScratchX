jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { runDraw } from '@/lib/services/luckyDraw/drawService';
import { expandInDrawOrder } from '@/lib/services/luckyDraw/winnerSelection';
import { ConflictError } from '@/lib/errors';
import { createCampaign, createOpenDraw, createEntry, newId, nextPhone } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true });
});

const categories = [
  { rank: 1, prizeDescription: 'Grand prize', prizeValue: 20000, quantity: 1 },
  { rank: 2, prizeDescription: 'Second prize', prizeValue: 5000, quantity: 2 },
  { rank: 3, prizeDescription: 'Third prize', prizeValue: 3000, quantity: 3 },
];

describe('expandInDrawOrder', () => {
  it('repeats each category once per winner and keeps the draw order', () => {
    const slots = expandInDrawOrder([categories[2], categories[0]]);
    expect(slots.map((s) => s.rank)).toEqual([3, 3, 3, 1]);
  });
});

describe('runDraw with prize categories', () => {
  it('picks one winner per slot, records the prize value and shows every category', async () => {
    const campaign = await createCampaign({ prizeTiers: categories });
    const draw = await createOpenDraw(campaign);
    for (let i = 0; i < 10; i++) await createEntry(campaign, draw, { customerPhone: nextPhone(), entriesGranted: 1 });

    const result = await runDraw(draw._id, { source: 'manual', accountId: newId() });

    expect(result.winners).toHaveLength(6);
    expect(result.winners.filter((w) => w.rank === 3).every((w) => w.prizeValue === 3000)).toBe(true);
    expect(new Set(result.winners.map((w) => w.customerPhone)).size).toBe(6);
    expect(result.draw.prizeTiersSnapshot.map((p) => p.quantity)).toEqual([1, 2, 3]);
    expect(result.draw.reveal.revealedCount).toBe(3);
    expect(result.draw.reveal.completedAt).toBeTruthy();
  });

  it('gives out fewer prizes when fewer customers entered', async () => {
    const campaign = await createCampaign({ prizeTiers: categories });
    const draw = await createOpenDraw(campaign);
    for (let i = 0; i < 4; i++) await createEntry(campaign, draw, { customerPhone: nextPhone() });

    const result = await runDraw(draw._id, { source: 'manual' });

    expect(result.winners).toHaveLength(4);
    expect(result.winners[0].rank).toBe(1);
  });

  it.each(['manual_online_reveal', 'manual_offline_reveal'])('refuses %s draws, which use slips', async (distributionMode) => {
    const campaign = await createCampaign({ distributionMode, entryTiers: [], prizeTiers: categories });
    const draw = await createOpenDraw(campaign);
    await expect(runDraw(draw._id, { source: 'manual' })).rejects.toThrow(ConflictError);
    const after = await LuckyDraw.findById(draw._id).lean();
    expect(after.status).toBe('scheduled');
  });
});
