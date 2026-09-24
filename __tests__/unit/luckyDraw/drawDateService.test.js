jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { changeDrawDate } from '@/lib/services/luckyDraw/drawDateService';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { createCampaign, createOpenDraw, createEntry, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true });
});

async function seed() {
  const campaign = await createCampaign();
  const draw = await createOpenDraw(campaign); // drawDate = now + 7 days
  return { campaign, draw, merchantId: campaign.merchantId };
}

const inDays = (n) => new Date(Date.now() + n * DAY);

describe('changeDrawDate', () => {
  it('moves the date later and records who, when, what and why', async () => {
    const { draw, merchantId } = await seed();
    const newDate = inDays(14);
    const now = new Date();

    const result = await changeDrawDate(draw._id, { merchantId, newDate, reason: 'Sales are low this month', now });

    expect(result.draw.drawDate).toEqual(newDate);
    expect(result.draw.status).toBe('scheduled');
    expect(result.draw.dateHistory).toHaveLength(1);
    expect(result.draw.dateHistory[0]).toMatchObject({
      previousDate: draw.drawDate,
      newDate,
      changedAt: now,
      reason: 'Sales are low this month',
      entrantsNotified: false,
    });
    expect(String(result.draw.dateHistory[0].changedByAccountId)).toBe(String(merchantId));
  });

  it('allows moving the date earlier, and any number of times', async () => {
    const { draw, merchantId } = await seed();
    await changeDrawDate(draw._id, { merchantId, newDate: inDays(20) });
    const result = await changeDrawDate(draw._id, { merchantId, newDate: inDays(2) });
    expect(result.draw.dateHistory).toHaveLength(2);
    expect(result.draw.dateHistory[1].previousDate).toEqual(result.draw.dateHistory[0].newDate);
    await expect(changeDrawDate(draw._id, { merchantId, newDate: inDays(30) })).resolves.toBeDefined();
  });

  it('accepts a date string as sent by the browser', async () => {
    const { draw, merchantId } = await seed();
    const iso = inDays(9).toISOString();
    const result = await changeDrawDate(draw._id, { merchantId, newDate: iso });
    expect(result.draw.drawDate.toISOString()).toBe(iso);
  });

  it('rejects a date that is not in the future', async () => {
    const { draw, merchantId } = await seed();
    await expect(changeDrawDate(draw._id, { merchantId, newDate: inDays(-1) })).rejects.toThrow(ValidationError);
    await expect(changeDrawDate(draw._id, { merchantId, newDate: inDays(-1) })).rejects.toThrow(/in the future/);
  });

  it.each([['garbage'], [undefined], [null], ['']])('rejects an invalid date (%p)', async (bad) => {
    const { draw, merchantId } = await seed();
    await expect(changeDrawDate(draw._id, { merchantId, newDate: bad })).rejects.toThrow(/valid draw date/);
  });

  it('rejects setting the date it already has', async () => {
    const { draw, merchantId } = await seed();
    await expect(changeDrawDate(draw._id, { merchantId, newDate: draw.drawDate })).rejects.toThrow(/already the draw date/);
  });

  it('rejects an over-long reason', async () => {
    const { draw, merchantId } = await seed();
    await expect(changeDrawDate(draw._id, { merchantId, newDate: inDays(10), reason: 'x'.repeat(301) })).rejects.toThrow(/300/);
  });

  it('only lets the owning merchant change it', async () => {
    const { draw } = await seed();
    await expect(changeDrawDate(draw._id, { merchantId: newId(), newDate: inDays(10) })).rejects.toThrow(NotFoundError);
    expect((await LuckyDraw.findById(draw._id)).dateHistory).toHaveLength(0);
  });

  it('cannot change the date once the draw has run or is running', async () => {
    const { campaign, merchantId } = await seed();
    const done = await createOpenDraw(campaign, { status: 'completed' });
    const running = await createOpenDraw(campaign, { status: 'running' });
    await expect(changeDrawDate(done._id, { merchantId, newDate: inDays(10) })).rejects.toThrow(ConflictError);
    await expect(changeDrawDate(running._id, { merchantId, newDate: inDays(10) })).rejects.toThrow(/before the draw runs/);
  });

  it('treats malformed ids as not found', async () => {
    await expect(changeDrawDate('nope', { merchantId: newId(), newDate: inDays(3) })).rejects.toThrow(NotFoundError);
  });

  it('keeps entries attached to the draw when the date moves', async () => {
    const { campaign, draw, merchantId } = await seed();
    await createEntry(campaign, draw);
    await changeDrawDate(draw._id, { merchantId, newDate: inDays(30) });
    const LuckyDrawEntry = (await import('@/models/luckyDrawEntryModel')).default;
    expect(await LuckyDrawEntry.countDocuments({ drawId: draw._id })).toBe(1);
  });

  describe('notifying entrants', () => {
    it('does not text anyone unless asked', async () => {
      const { campaign, draw, merchantId } = await seed();
      await createEntry(campaign, draw, { customerPhone: '9000000001' });

      const result = await changeDrawDate(draw._id, { merchantId, newDate: inDays(10) });

      expect(sendSms).not.toHaveBeenCalled();
      expect(result).toMatchObject({ entrantCount: 0, notifiedCount: 0 });
      expect(result.draw.dateHistory[0].entrantsNotified).toBe(false);
    });

    it('texts each distinct entrant once, with both dates and the notice, and records it', async () => {
      const { campaign, draw, merchantId } = await seed();
      await createEntry(campaign, draw, { customerPhone: '9000000001' });
      await createEntry(campaign, draw, { customerPhone: '9000000001', billAmount: 1300 });
      await createEntry(campaign, draw, { customerPhone: '9000000002' });

      const result = await changeDrawDate(draw._id, { merchantId, newDate: inDays(10), notifyEntrants: true });

      expect(sendSms).toHaveBeenCalledTimes(2);
      expect(sendSms.mock.calls.map((c) => c[0]).sort()).toEqual(['9000000001', '9000000002']);
      expect(sendSms.mock.calls[0][1]).toContain(DATE_CHANGE_NOTICE);
      expect(result).toMatchObject({ entrantCount: 2, notifiedCount: 2 });
      expect(result.draw.dateHistory[0]).toMatchObject({ entrantsNotified: true, entrantsNotifiedCount: 2 });
    });

    it('handles more entrants than one batch', async () => {
      const { campaign, draw, merchantId } = await seed();
      for (let i = 0; i < 45; i++) {
        await createEntry(campaign, draw, { customerPhone: `91000000${String(i).padStart(2, '0')}` });
      }
      const result = await changeDrawDate(draw._id, { merchantId, newDate: inDays(10), notifyEntrants: true });
      expect(sendSms).toHaveBeenCalledTimes(45);
      expect(result.notifiedCount).toBe(45);
    });

    it('still saves the new date when the SMS provider is down, and records that nobody was told', async () => {
      sendSms.mockRejectedValue(new Error('Twilio error: down'));
      const { campaign, draw, merchantId } = await seed();
      await createEntry(campaign, draw, { customerPhone: '9000000001' });
      const newDate = inDays(10);

      const result = await changeDrawDate(draw._id, { merchantId, newDate, notifyEntrants: true });

      expect(result.draw.drawDate).toEqual(newDate);
      expect(result).toMatchObject({ entrantCount: 1, notifiedCount: 0 });
      expect(result.draw.dateHistory[0]).toMatchObject({ entrantsNotified: false, entrantsNotifiedCount: 0 });
    });

    it('counts only the messages that actually went out', async () => {
      sendSms.mockRejectedValueOnce(new Error('bad number'));
      const { campaign, draw, merchantId } = await seed();
      await createEntry(campaign, draw, { customerPhone: '9000000001' });
      await createEntry(campaign, draw, { customerPhone: '9000000002' });
      await createEntry(campaign, draw, { customerPhone: '9000000003' });

      const result = await changeDrawDate(draw._id, { merchantId, newDate: inDays(10), notifyEntrants: true });

      expect(result.notifiedCount).toBe(2);
      expect(result.draw.dateHistory[0]).toMatchObject({ entrantsNotified: true, entrantsNotifiedCount: 2 });
    });
  });
});
