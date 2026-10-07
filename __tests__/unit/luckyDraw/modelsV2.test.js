import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { campaignData, createCampaign, createOpenDraw, newId, DAY } from '../../helpers/luckyDrawFixtures';

describe('LuckyDrawCampaign v2 fields', () => {
  it('defaults to online mode, one winner per prize and no image', async () => {
    const campaign = await LuckyDrawCampaign.create(campaignData());
    expect(campaign.distributionMode).toBe('online');
    expect(campaign.prizeTiers[0].quantity).toBe(1);
    expect(campaign.prizeTiers[0].imageUrl).toBeNull();
    expect(campaign.slipCount).toBe(0);
  });

  it('stores prize quantity and image', async () => {
    const campaign = await createCampaign({
      prizeTiers: [{ rank: 1, prizeDescription: 'Gold coin', prizeValue: 5000, quantity: 5, imageUrl: 'data:image/jpeg;base64,AAAA' }],
    });
    expect(campaign.prizeTiers[0].quantity).toBe(5);
    expect(campaign.prizeTiers[0].imageUrl).toBe('data:image/jpeg;base64,AAAA');
  });

  it('rejects an unknown distribution mode and a prize quantity below 1', async () => {
    await expect(createCampaign({ distributionMode: 'carrier_pigeon' })).rejects.toThrow();
    await expect(
      createCampaign({ prizeTiers: [{ rank: 1, prizeDescription: 'TV', quantity: 0 }] }),
    ).rejects.toThrow();
  });

  it('lets manual modes skip entry ranges, but not online mode', async () => {
    await expect(
      createCampaign({ distributionMode: 'manual_offline_reveal', entryTiers: [] }),
    ).resolves.toBeDefined();
    await expect(
      createCampaign({ distributionMode: 'manual_online_reveal', entryTiers: [] }),
    ).resolves.toBeDefined();
    await expect(createCampaign({ distributionMode: 'online', entryTiers: [] })).rejects.toThrow(/entry tier/i);
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
  it('starts with nothing revealed and no manual picks', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    expect(draw.reveal.revealedCount).toBe(0);
    expect(draw.reveal.startedAt).toBeUndefined();
    expect(draw.manualPicks).toHaveLength(0);
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

  it('saves a slip winner without an entry or phone', async () => {
    const winner = await LuckyDrawWinner.create({ ...base(), slipNumber: 457, prizeValue: 5000 });
    expect(winner.slipNumber).toBe(457);
    expect(winner.prizeValue).toBe(5000);
  });

  it('needs either an online entry or a slip number', async () => {
    await expect(LuckyDrawWinner.create(base())).rejects.toThrow(/entry|slip/i);
    await expect(
      LuckyDrawWinner.create({ ...base(), entryId: newId(), customerName: 'Asha', customerPhone: '9000000001' }),
    ).resolves.toBeDefined();
  });
});
