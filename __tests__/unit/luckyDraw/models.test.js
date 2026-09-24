import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { campaignData, createCampaign, createOpenDraw, createEntry, newId, DAY } from '../../helpers/luckyDrawFixtures';

describe('LuckyDrawCampaign', () => {
  it('saves a valid campaign and defaults the trigger mode to automatic', async () => {
    const data = campaignData();
    delete data.drawConfig.triggerMode;
    const campaign = await LuckyDrawCampaign.create(data);
    expect(campaign.drawConfig.triggerMode).toBe('automatic');
    expect(campaign.status).toBe('active');
  });

  it('requires at least one entry tier and one prize', async () => {
    await expect(LuckyDrawCampaign.create(campaignData({ entryTiers: [] }))).rejects.toThrow(/entry tier/i);
    await expect(LuckyDrawCampaign.create(campaignData({ prizeTiers: [] }))).rejects.toThrow(/prize/i);
  });

  it('requires the end date to be after the start date', async () => {
    const start = new Date();
    await expect(
      LuckyDrawCampaign.create(campaignData({ startDate: start, endDate: new Date(start.getTime() - DAY) })),
    ).rejects.toThrow(/end date/i);
  });

  it('requires a frequency for recurring draws and a weekday for weekly ones', async () => {
    await expect(
      LuckyDrawCampaign.create(campaignData({ drawConfig: { scheduleType: 'recurring', triggerMode: 'manual' } })),
    ).rejects.toThrow(/frequency/i);
    await expect(
      LuckyDrawCampaign.create(
        campaignData({
          drawConfig: { scheduleType: 'recurring', triggerMode: 'manual', recurrence: { frequency: 'weekly' } },
        }),
      ),
    ).rejects.toThrow(/weekday/i);
  });

  it('rejects a malformed draw time and an unknown trigger mode', async () => {
    await expect(
      LuckyDrawCampaign.create(
        campaignData({
          drawConfig: { scheduleType: 'recurring', recurrence: { frequency: 'daily', time: '6pm' } },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      LuckyDrawCampaign.create(campaignData({ drawConfig: { scheduleType: 'end_of_campaign', triggerMode: 'auto' } })),
    ).rejects.toThrow();
  });
});

describe('LuckyDraw', () => {
  beforeAll(() => LuckyDraw.init());

  it('defaults to scheduled with an empty date history', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    expect(draw.status).toBe('scheduled');
    expect(draw.dateHistory).toHaveLength(0);
  });

  it('allows only one scheduled draw per campaign', async () => {
    const campaign = await createCampaign();
    await createOpenDraw(campaign);
    await expect(createOpenDraw(campaign)).rejects.toMatchObject({ code: 11000 });
  });

  it('allows a scheduled draw alongside completed ones, and one per campaign', async () => {
    const campaign = await createCampaign();
    await createOpenDraw(campaign, { status: 'completed' });
    await createOpenDraw(campaign, { status: 'completed' });
    await createOpenDraw(campaign);
    const other = await createCampaign();
    await expect(createOpenDraw(other)).resolves.toBeDefined();
  });
});

describe('LuckyDrawEntry', () => {
  it('requires a 10-digit phone and explicit consent', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    await expect(createEntry(campaign, draw, { customerPhone: '12345' })).rejects.toThrow();
    await expect(createEntry(campaign, draw, { consent: false })).rejects.toThrow(/consent/i);
    await expect(createEntry(campaign, draw)).resolves.toBeDefined();
  });

  it('requires at least one granted entry', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    await expect(createEntry(campaign, draw, { entriesGranted: 0 })).rejects.toThrow();
  });
});

describe('LuckyDrawWinner', () => {
  beforeAll(() => LuckyDrawWinner.init());

  const winner = (overrides = {}) => ({
    drawId: newId(),
    campaignId: newId(),
    merchantId: newId(),
    rank: 1,
    entryId: newId(),
    customerName: 'Asha Verma',
    customerPhone: '9000000001',
    prizeDescription: 'Smart TV',
    claimCode: 'ABCD2345',
    expiresAt: new Date(Date.now() + 30 * DAY),
    ...overrides,
  });

  it('defaults to pending', async () => {
    expect((await LuckyDrawWinner.create(winner())).status).toBe('pending');
  });

  it('enforces unique claim codes', async () => {
    await LuckyDrawWinner.create(winner());
    await expect(LuckyDrawWinner.create(winner())).rejects.toMatchObject({ code: 11000 });
  });
});
