import LuckyDraw from '@/models/luckyDrawModel';
import { ensureOpenDraw, assertDrawOwner } from '@/lib/services/luckyDraw/openDraw';
import { createCampaign, createOpenDraw, newId } from '../../helpers/luckyDrawFixtures';
import { NotFoundError } from '@/lib/errors';

beforeAll(() => LuckyDraw.init());

describe('ensureOpenDraw', () => {
  it('creates a scheduled draw dated at entries close when there is no draw date', async () => {
    const campaign = await createCampaign();
    const now = new Date();

    const draw = await ensureOpenDraw(campaign.toObject(), now);

    expect(draw.status).toBe('scheduled');
    expect(new Date(draw.drawDate)).toEqual(campaign.endDate);
    expect(new Date(draw.periodStart)).toEqual(now);
  });

  it('dates the draw on the campaign draw date', async () => {
    const revealDate = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    const campaign = await createCampaign({ revealDate });
    const draw = await ensureOpenDraw(campaign.toObject(), new Date());
    expect(new Date(draw.drawDate)).toEqual(revealDate);
  });

  it('returns the existing scheduled draw instead of creating another', async () => {
    const campaign = await createCampaign();
    const existing = await createOpenDraw(campaign);

    const draw = await ensureOpenDraw(campaign.toObject());

    expect(String(draw._id)).toBe(String(existing._id));
    expect(await LuckyDraw.countDocuments({ campaignId: campaign._id })).toBe(1);
  });

  it('produces a single draw when called concurrently', async () => {
    const campaign = await createCampaign();
    const lean = campaign.toObject();

    const results = await Promise.all([ensureOpenDraw(lean), ensureOpenDraw(lean), ensureOpenDraw(lean)]);

    expect(new Set(results.map((d) => String(d._id))).size).toBe(1);
    expect(await LuckyDraw.countDocuments({ campaignId: campaign._id, status: 'scheduled' })).toBe(1);
  });
});

describe('assertDrawOwner', () => {
  it('returns the draw and campaign for the owning merchant', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);

    const result = await assertDrawOwner(draw._id, campaign.merchantId);

    expect(String(result.draw._id)).toBe(String(draw._id));
    expect(String(result.campaign._id)).toBe(String(campaign._id));
  });

  it('treats another merchant\'s draw as not found', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    await expect(assertDrawOwner(draw._id, newId())).rejects.toThrow(NotFoundError);
  });

  it('treats malformed and unknown ids as not found', async () => {
    await expect(assertDrawOwner('nope', newId())).rejects.toThrow(NotFoundError);
    await expect(assertDrawOwner(newId(), newId())).rejects.toThrow(NotFoundError);
  });
});
