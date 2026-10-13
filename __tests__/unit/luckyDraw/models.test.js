import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { campaignData, createCampaign, createOpenDraw, createEntry, newId, DAY } from '../../helpers/luckyDrawFixtures';

describe('LuckyDrawCampaign', () => {
  it('saves a valid campaign with its draw type, minimum bill and an entry counter at 0', async () => {
    const campaign = await LuckyDrawCampaign.create(campaignData({ drawType: 'physical', minBillAmount: 1000 }));
    expect(campaign).toMatchObject({ drawType: 'physical', minBillAmount: 1000, entryCounter: 0, status: 'active' });
  });

  it('requires a known draw type and a minimum bill of 0 or more', async () => {
    const noType = campaignData();
    delete noType.drawType;
    await expect(LuckyDrawCampaign.create(noType)).rejects.toThrow(/drawType/);
    await expect(LuckyDrawCampaign.create(campaignData({ drawType: 'weekly' }))).rejects.toThrow();
    const noMin = campaignData();
    delete noMin.minBillAmount;
    await expect(LuckyDrawCampaign.create(noMin)).rejects.toThrow(/minBillAmount/);
    await expect(LuckyDrawCampaign.create(campaignData({ minBillAmount: -1 }))).rejects.toThrow();
  });

  it('needs a grand prize and a 2nd prize, an optional 3rd, and one grand prize winner', async () => {
    const grand = { rank: 1, prizeDescription: 'TV', prizeValue: 20000, quantity: 1 };
    const second = { rank: 2, prizeDescription: 'Coin', prizeValue: 5000, quantity: 2 };
    const third = { rank: 3, prizeDescription: 'Voucher', prizeValue: 2000, quantity: 5 };
    await expect(LuckyDrawCampaign.create(campaignData({ prizeTiers: [grand, second, third] }))).resolves.toBeDefined();
    await expect(LuckyDrawCampaign.create(campaignData({ prizeTiers: [grand] }))).rejects.toThrow(/grand prize and a 2nd prize/);
    await expect(LuckyDrawCampaign.create(campaignData({ prizeTiers: [] }))).rejects.toThrow(/prize/i);
    await expect(LuckyDrawCampaign.create(campaignData({ prizeTiers: [{ ...grand, quantity: 2 }, second] }))).rejects.toThrow(/exactly 1 winner/);
    await expect(LuckyDrawCampaign.create(campaignData({ prizeTiers: [grand, second, { ...third, rank: 4 }] }))).rejects.toThrow();
  });

  it('keeps a store snapshot without a location', async () => {
    const data = campaignData();
    data.assignedStores[0] = { ...data.assignedStores[0], latitude: undefined, longitude: undefined };
    const campaign = await LuckyDrawCampaign.create(data);
    expect(campaign.assignedStores[0].latitude).toBeNull();
  });

  it('requires the end date to be after the start date and the draw date on or after the end', async () => {
    const start = new Date();
    await expect(
      LuckyDrawCampaign.create(campaignData({ startDate: start, endDate: new Date(start.getTime() - DAY) })),
    ).rejects.toThrow(/end date/i);
    const end = new Date(start.getTime() + DAY);
    await expect(
      LuckyDrawCampaign.create(campaignData({ startDate: start, endDate: end, revealDate: new Date(end.getTime() - 1000) })),
    ).rejects.toThrow(/reveal date/i);
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

  it('starts with nothing revealed and accepts "picked" as who ran it', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign, { triggeredBy: { source: 'picked', accountId: campaign.merchantId } });
    expect(draw.reveal.revealedCount).toBe(0);
    expect(draw.triggeredBy.source).toBe('picked');
  });
});

describe('LuckyDrawEntry', () => {
  beforeAll(() => LuckyDrawEntry.init());

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

  it('records its number, where it came from and who typed it in', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    const staffId = newId();
    const entry = await createEntry(campaign, draw, { entryNumber: 7, source: 'staff', addedByAccountId: staffId });
    expect(entry).toMatchObject({ entryNumber: 7, source: 'staff' });
    expect(String(entry.addedByAccountId)).toBe(String(staffId));
    await expect(createEntry(campaign, draw, { source: 'phone' })).rejects.toThrow();
    await expect(createEntry(campaign, draw, { entryNumber: 0 })).rejects.toThrow();
  });

  it('never gives two entries of one campaign the same number', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    await createEntry(campaign, draw, { entryNumber: 1 });
    await expect(createEntry(campaign, draw, { entryNumber: 1 })).rejects.toMatchObject({ code: 11000 });
    const other = await createCampaign();
    await expect(createEntry(other, await createOpenDraw(other), { entryNumber: 1 })).resolves.toBeDefined();
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
