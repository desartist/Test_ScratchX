jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn() };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import * as drawService from '@/lib/services/luckyDraw/drawService';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { runLuckyDrawJob } from '@/lib/cron/luckyDrawJob';
import { createCampaign, createOpenDraw, createEntry, newId, nextPhone, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => {
  sendSms.mockReset();
  sendSms.mockResolvedValue({ success: true });
});

const due = { drawDate: new Date(Date.now() - 1000) };

async function dueDraw({ campaign = {}, draw = due } = {}) {
  const c = await createCampaign(campaign);
  const d = await createOpenDraw(c, draw);
  await createEntry(c, d, { customerPhone: nextPhone() });
  return { campaign: c, draw: d };
}

describe('runLuckyDrawJob', () => {
  it('runs due draws of active automatic campaigns', async () => {
    const { draw } = await dueDraw();

    const result = await runLuckyDrawJob();

    expect(result).toMatchObject({ ran: 1, failed: 0 });
    expect((await LuckyDraw.findById(draw._id)).status).toBe('completed');
  });

  it('leaves manual campaigns, future draws and paused campaigns alone', async () => {
    const manual = await dueDraw({ campaign: { drawConfig: { scheduleType: 'end_of_campaign', triggerMode: 'manual' } } });
    const future = await dueDraw({ draw: { drawDate: new Date(Date.now() + DAY) } });
    const paused = await dueDraw({ campaign: { status: 'paused' } });

    const result = await runLuckyDrawJob();

    expect(result.ran).toBe(0);
    for (const { draw } of [manual, future, paused]) {
      expect((await LuckyDraw.findById(draw._id)).status).toBe('scheduled');
    }
  });

  it('keeps going when one draw fails, and reports it', async () => {
    await dueDraw();
    await dueDraw();
    const spy = jest.spyOn(drawService, 'runDraw').mockRejectedValueOnce(new Error('boom'));
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await runLuckyDrawJob();

    expect(result).toMatchObject({ ran: 1, failed: 1 });
    spy.mockRestore();
    errors.mockRestore();
  });

  it('does not count a draw someone else just ran as a failure', async () => {
    const { draw } = await dueDraw();
    const { ConflictError } = await import('@/lib/errors');
    const spy = jest.spyOn(drawService, 'runDraw').mockRejectedValueOnce(new ConflictError('already ran'));

    const result = await runLuckyDrawJob();

    expect(result).toMatchObject({ ran: 0, failed: 0 });
    expect(draw).toBeDefined();
    spy.mockRestore();
  });

  it('retries winners whose SMS failed earlier', async () => {
    const { campaign, draw } = await dueDraw({ draw: { status: 'completed', drawDate: new Date(Date.now() - DAY) } });
    await LuckyDrawWinner.create({
      drawId: draw._id,
      campaignId: campaign._id,
      merchantId: campaign.merchantId,
      rank: 1,
      entryId: newId(),
      customerName: 'Asha Verma',
      customerPhone: '9000000001',
      prizeDescription: 'Smart TV',
      claimCode: 'RETRY234',
      status: 'pending',
      expiresAt: new Date(Date.now() + DAY),
    });

    const result = await runLuckyDrawJob();

    expect(result.notified).toBe(1);
    expect((await LuckyDrawWinner.findOne({ claimCode: 'RETRY234' })).status).toBe('notified');
  });

  it('expires stale winners', async () => {
    const { campaign, draw } = await dueDraw({ draw: { status: 'completed' } });
    await LuckyDrawWinner.create({
      drawId: draw._id,
      campaignId: campaign._id,
      merchantId: campaign.merchantId,
      rank: 1,
      entryId: newId(),
      customerName: 'Asha Verma',
      customerPhone: '9000000001',
      prizeDescription: 'Smart TV',
      claimCode: 'STALE234',
      status: 'notified',
      expiresAt: new Date(Date.now() - 1000),
    });

    expect((await runLuckyDrawJob()).expired).toBe(1);
  });
});
