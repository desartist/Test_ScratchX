import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { campaignData, createCampaign, createOpenDraw, newId, DAY } from '../../helpers/luckyDrawFixtures';

describe('LuckyDrawCampaign v2 fields', () => {
  it('defaults to showing winners at once, one winner per prize and no image', async () => {
    const campaign = await LuckyDrawCampaign.create(campaignData());
    expect(campaign.revealMode).toBe('instant');
    expect(campaign.prizeTiers[0].quantity).toBe(1);
    expect(campaign.prizeTiers[0].imageUrl).toBeNull();
  });

  it('stores prize quantity and image', async () => {
    const campaign = await createCampaign({
      prizeTiers: [{ rank: 1, prizeDescription: 'Gold coin', prizeValue: 5000, quantity: 5, imageUrl: 'data:image/jpeg;base64,AAAA' }],
    });
    expect(campaign.prizeTiers[0].quantity).toBe(5);
    expect(campaign.prizeTiers[0].imageUrl).toBe('data:image/jpeg;base64,AAAA');
  });

  it('rejects an unknown reveal mode and a prize quantity below 1', async () => {
    await expect(createCampaign({ revealMode: 'carrier_pigeon' })).rejects.toThrow();
    await expect(
      createCampaign({ prizeTiers: [{ rank: 1, prizeDescription: 'TV', quantity: 0 }] }),
    ).rejects.toThrow();
  });

  it('always needs bill ranges and store locations, because every entry comes in by QR', async () => {
    await expect(createCampaign({ entryTiers: [] })).rejects.toThrow(/entry tier/i);
    await expect(createCampaign({ revealMode: 'live', entryTiers: [] })).rejects.toThrow(/entry tier/i);
    const [store] = campaignData().assignedStores;
    await expect(createCampaign({ assignedStores: [{ ...store, latitude: null }] })).rejects.toThrow(/latitude/i);
  });

  it('only allows a live reveal as one draw the owner starts', async () => {
    await expect(createCampaign({ revealMode: 'live' })).rejects.toThrow(/live reveal/i);
    await expect(
      createCampaign({ revealMode: 'live', drawConfig: { scheduleType: 'end_of_campaign', triggerMode: 'manual' } }),
    ).resolves.toBeDefined();
  });

  it('requires the reveal date to be on or after entries close', async () => {
    const now = Date.now();
    const endDate = new Date(now + 10 * DAY);
    await expect(createCampaign({ endDate, revealDate: new Date(now + 5 * DAY) })).rejects.toThrow(/reveal/i);
    await expect(createCampaign({ endDate, revealDate: endDate })).resolves.toBeDefined();
    await expect(createCampaign({ endDate, revealDate: new Date(now + 12 * DAY) })).resolves.toBeDefined();
  });
});

describe('LuckyDraw v2 fields', () => {
  it('starts with nothing revealed', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    expect(draw.reveal.revealedCount).toBe(0);
    expect(draw.reveal.startedAt).toBeUndefined();
  });
});

describe('LuckyDrawWinner v2 fields', () => {
  const base = () => ({
    drawId: newId(),
    campaignId: newId(),
    merchantId: newId(),
    rank: 1,
    prizeDescription: 'Gold coin',
    claimCode: `C${Date.now()}${Math.floor(Math.random() * 1e6)}`,
    expiresAt: new Date(Date.now() + 30 * DAY),
  });

  it('always points at the QR entry and the customer who won', async () => {
    await expect(LuckyDrawWinner.create(base())).rejects.toThrow(/entryId|customerName|customerPhone/);
    const winner = await LuckyDrawWinner.create({ ...base(), entryId: newId(), customerName: 'Asha', customerPhone: '9000000001', prizeValue: 5000 });
    expect(winner.prizeValue).toBe(5000);
    expect(winner.hiddenUntilReveal).toBe(false);
  });
});
