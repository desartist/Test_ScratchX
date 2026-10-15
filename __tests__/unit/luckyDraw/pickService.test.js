jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn().mockResolvedValue({ success: true }) };
});

import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { sendSms } from '@/lib/services/luckyDraw/notifier';
import { saveWinnerPicks } from '@/lib/services/luckyDraw/pickService';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { createCampaign, createOpenDraw, createEntry, nextPhone, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());
beforeEach(() => sendSms.mockClear());

const prizes = [
  { rank: 1, prizeDescription: 'Smart TV', prizeValue: 20000, quantity: 1 },
  { rank: 2, prizeDescription: 'Gold coin', prizeValue: 5000, quantity: 2 },
];

async function closedPhysical({ people = 5, drawType = 'physical' } = {}) {
  const campaign = await createCampaign({ drawType, prizeTiers: prizes, startDate: new Date(Date.now() - 10 * DAY), endDate: new Date(Date.now() - 1000) });
  const draw = await createOpenDraw(campaign);
  const entries = [];
  for (let i = 0; i < people; i += 1) entries.push(await createEntry(campaign, draw, { customerPhone: nextPhone(), source: 'staff' }));
  return { campaign, draw, entries, merchantId: String(campaign.merchantId), drawId: String(draw._id) };
}

const pick = (rank, entry) => ({ rank, entryId: String(entry._id) });

describe('saveWinnerPicks', () => {
  it('saves every winner, completes the draw, ends the lucky draw and texts the winners', async () => {
    const { campaign, entries, merchantId, drawId } = await closedPhysical();

    const result = await saveWinnerPicks(merchantId, drawId, [pick(1, entries[2]), pick(2, entries[0]), pick(2, entries[4])]);

    expect(result.winners.map((w) => [w.rank, w.customerPhone])).toEqual([
      [1, entries[2].customerPhone],
      [2, entries[0].customerPhone],
      [2, entries[4].customerPhone],
    ]);
    expect(new Set(result.winners.map((w) => w.claimCode)).size).toBe(3);
    expect(result.draw).toMatchObject({ status: 'completed', winnerCount: 3, entryCount: 5 });
    expect(result.draw.triggeredBy.source).toBe('picked');
    expect(result.draw.reveal.revealedCount).toBe(2);
    expect(result.notified.sent).toBe(3);
    expect(sendSms).toHaveBeenCalledTimes(3);
    expect((await LuckyDrawCampaign.findById(campaign._id)).status).toBe('ended');
  });

  it('needs every slot filled', async () => {
    const { entries, merchantId, drawId } = await closedPhysical();
    await expect(saveWinnerPicks(merchantId, drawId, [pick(1, entries[0]), pick(2, entries[1])])).rejects.toThrow('Pick a winner for every prize');
  });

  it('refuses the same customer twice, even with two different entries', async () => {
    const { campaign, draw, entries, merchantId, drawId } = await closedPhysical();
    const again = await createEntry(campaign, draw, { customerPhone: entries[0].customerPhone, customerName: 'Asha Verma' });
    await expect(saveWinnerPicks(merchantId, drawId, [pick(1, entries[0]), pick(2, again), pick(2, entries[1])])).rejects.toThrow(
      'Asha Verma is picked twice. A customer can win only one prize.',
    );
    expect(await LuckyDrawWinner.countDocuments({ drawId })).toBe(0);
  });

  it('refuses entries from another draw and unknown ranks', async () => {
    const { entries, merchantId, drawId } = await closedPhysical();
    const other = await closedPhysical();
    await expect(saveWinnerPicks(merchantId, drawId, [pick(1, other.entries[0]), pick(2, entries[0]), pick(2, entries[1])])).rejects.toThrow(
      'One of the picked entries is not in this draw',
    );
    await expect(saveWinnerPicks(merchantId, drawId, [pick(1, entries[0]), pick(3, entries[1]), pick(2, entries[2])])).rejects.toThrow(ValidationError);
  });

  it('lets the owner finish when fewer customers entered than there are prizes, grand prize first', async () => {
    const { entries, merchantId, drawId } = await closedPhysical({ people: 2 });
    await expect(saveWinnerPicks(merchantId, drawId, [pick(2, entries[0]), pick(2, entries[1])])).rejects.toThrow(
      'Fill the bigger prizes first: the Grand Prize, then the Second Prizes, then the Third Prizes',
    );
    const result = await saveWinnerPicks(merchantId, drawId, [pick(1, entries[0]), pick(2, entries[1])]);
    expect(result.winners).toHaveLength(2);
  });

  it('pluralises the short-of-customers message correctly for exactly one customer', async () => {
    const { merchantId, drawId } = await closedPhysical({ people: 1 });
    await expect(saveWinnerPicks(merchantId, drawId, [])).rejects.toThrow(
      'Only 1 customer entered, so pick 1 winner, starting with the Grand Prize',
    );
  });

  it('refuses before entries close, twice, for other draw types, other merchants and an empty draw', async () => {
    const open = await createCampaign({ drawType: 'physical', prizeTiers: prizes });
    const openDraw = await createOpenDraw(open);
    const e = await createEntry(open, openDraw);
    await expect(saveWinnerPicks(String(open.merchantId), String(openDraw._id), [pick(1, e)])).rejects.toThrow('You can pick the winners once entries close');

    const { entries, merchantId, drawId } = await closedPhysical();
    const picks = [pick(1, entries[0]), pick(2, entries[1]), pick(2, entries[2])];
    await expect(saveWinnerPicks(String(newId()), drawId, picks)).rejects.toThrow(NotFoundError);
    await saveWinnerPicks(merchantId, drawId, picks);
    await expect(saveWinnerPicks(merchantId, drawId, picks)).rejects.toThrow('The winners of this draw are already saved');

    const digital = await closedPhysical({ drawType: 'digital' });
    await expect(saveWinnerPicks(digital.merchantId, digital.drawId, [pick(1, digital.entries[0])])).rejects.toThrow(ConflictError);

    const empty = await closedPhysical({ people: 0 });
    await expect(saveWinnerPicks(empty.merchantId, empty.drawId, [])).rejects.toThrow('Nobody entered this draw, so there is no one to pick');
  });
});
