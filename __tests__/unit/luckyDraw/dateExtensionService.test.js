jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { extendDates } from '@/lib/services/luckyDraw/dateExtensionService';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { createCampaign, createOpenDraw, createEntry, nextPhone, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true });
});

const NOW = new Date('2026-10-20T06:30:00.000Z');
const OPEN = new Date('2026-10-05T00:00:00.000Z');
const CLOSE = new Date('2026-10-31T18:29:00.000Z');
const REVEAL = new Date('2026-11-02T13:30:00.000Z');

async function seed(overrides = {}) {
  const campaign = await createCampaign({ startDate: OPEN, endDate: CLOSE, revealDate: REVEAL, ...overrides });
  const draw = await createOpenDraw(campaign, { drawDate: REVEAL });
  return { campaign, draw, merchantId: String(campaign.merchantId) };
}

describe('extendDates: entries close', () => {
  it('moves entries close later and leaves the reveal alone when there is room', async () => {
    const { campaign, draw, merchantId } = await seed();
    const newDate = new Date(CLOSE.getTime() + DAY);

    const result = await extendDates(String(campaign._id), { merchantId, target: 'entries_close', newDate, now: NOW });

    expect(result.campaign.endDate.toISOString()).toBe(newDate.toISOString());
    expect(result.draw.drawDate.toISOString()).toBe(REVEAL.toISOString());
    expect(result.revealMoved).toBe(false);
    const stored = await LuckyDraw.findById(draw._id).lean();
    expect(stored.dateHistory).toHaveLength(1);
    expect(stored.dateHistory[0]).toMatchObject({ kind: 'entries_close', previousDate: CLOSE, newDate });
  });

  it('moves the reveal too, keeping the same gap, when entries would close after it', async () => {
    const { campaign, merchantId } = await seed();
    const newDate = new Date(CLOSE.getTime() + 7 * DAY);

    const result = await extendDates(String(campaign._id), { merchantId, target: 'entries_close', newDate, now: NOW });

    const gap = REVEAL.getTime() - CLOSE.getTime();
    expect(result.revealMoved).toBe(true);
    expect(result.draw.drawDate.getTime()).toBe(newDate.getTime() + gap);
    expect(result.campaign.revealDate.getTime()).toBe(newDate.getTime() + gap);
    expect(result.draw.dateHistory.map((h) => h.kind)).toEqual(['entries_close', 'reveal']);
  });

  it('only moves dates later', async () => {
    const { campaign, merchantId } = await seed();
    await expect(
      extendDates(String(campaign._id), { merchantId, target: 'entries_close', newDate: new Date(CLOSE.getTime() - DAY), now: NOW }),
    ).rejects.toThrow(/later/i);
    await expect(
      extendDates(String(campaign._id), { merchantId, target: 'entries_close', newDate: CLOSE, now: NOW }),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses once entries have closed or the draw has finished', async () => {
    const { campaign, merchantId } = await seed();
    await expect(
      extendDates(String(campaign._id), {
        merchantId,
        target: 'entries_close',
        newDate: new Date(CLOSE.getTime() + 5 * DAY),
        now: new Date(CLOSE.getTime() + DAY),
      }),
    ).rejects.toThrow(ConflictError);

    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'ended' } });
    await expect(
      extendDates(String(campaign._id), { merchantId, target: 'entries_close', newDate: new Date(CLOSE.getTime() + DAY), now: NOW }),
    ).rejects.toThrow(ConflictError);
  });

  it('texts each customer who entered once when asked', async () => {
    const { campaign, draw, merchantId } = await seed();
    const phone = nextPhone();
    await createEntry(campaign, draw, { customerPhone: phone });
    await createEntry(campaign, draw, { customerPhone: phone, billAmount: 3000 });
    await createEntry(campaign, draw, { customerPhone: nextPhone() });

    const result = await extendDates(String(campaign._id), {
      merchantId,
      target: 'entries_close',
      newDate: new Date(CLOSE.getTime() + 7 * DAY),
      notifyEntrants: true,
      now: NOW,
    });

    expect(sendSms).toHaveBeenCalledTimes(2);
    expect(sendSms.mock.calls[0][1]).toMatch(/Diwali Lucky Draw/);
    expect(result).toMatchObject({ entrantCount: 2, notifiedCount: 2 });
  });
});

describe('extendDates: reveal', () => {
  it('moves the reveal later and records it', async () => {
    const { campaign, merchantId } = await seed();
    const newDate = new Date(REVEAL.getTime() + 3 * DAY);

    const result = await extendDates(String(campaign._id), { merchantId, target: 'reveal', newDate, now: NOW });

    expect(result.draw.drawDate.toISOString()).toBe(newDate.toISOString());
    expect(result.campaign.revealDate.toISOString()).toBe(newDate.toISOString());
    expect(result.campaign.endDate.toISOString()).toBe(CLOSE.toISOString());
    expect(result.draw.dateHistory[0]).toMatchObject({ kind: 'reveal', previousDate: REVEAL, newDate });
  });

  it('refuses an earlier reveal and one after the reveal has started', async () => {
    const { campaign, draw, merchantId } = await seed();
    await expect(
      extendDates(String(campaign._id), { merchantId, target: 'reveal', newDate: new Date(REVEAL.getTime() - DAY), now: NOW }),
    ).rejects.toThrow(/later/i);

    await LuckyDraw.updateOne({ _id: draw._id }, { $set: { status: 'completed' } });
    await expect(
      extendDates(String(campaign._id), { merchantId, target: 'reveal', newDate: new Date(REVEAL.getTime() + DAY), now: NOW }),
    ).rejects.toThrow(ConflictError);
  });

  it('works for a draft that has no draw yet by moving the campaign dates', async () => {
    const campaign = await createCampaign({ startDate: OPEN, endDate: CLOSE, revealDate: REVEAL, status: 'draft' });
    const newDate = new Date(REVEAL.getTime() + DAY);
    const result = await extendDates(String(campaign._id), {
      merchantId: String(campaign.merchantId),
      target: 'reveal',
      newDate,
      now: NOW,
    });
    expect(result.draw).toBeNull();
    expect(result.campaign.revealDate.toISOString()).toBe(newDate.toISOString());
  });
});

describe('extendDates: access and input', () => {
  it('hides other merchants’ draws and rejects unknown targets', async () => {
    const { campaign, merchantId } = await seed();
    await expect(
      extendDates(String(campaign._id), { merchantId: String(campaign._id), target: 'reveal', newDate: new Date(REVEAL.getTime() + DAY), now: NOW }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      extendDates(String(campaign._id), { merchantId, target: 'start', newDate: new Date(REVEAL.getTime() + DAY), now: NOW }),
    ).rejects.toThrow(ValidationError);
    await expect(
      extendDates(String(campaign._id), { merchantId, target: 'reveal', newDate: 'not a date', now: NOW }),
    ).rejects.toThrow(ValidationError);
  });
});
