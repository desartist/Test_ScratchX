import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import { findNearestStore } from '@/lib/services/luckyDraw/locationCheck';
import {
  createEntry,
  shouldSendConfirmation,
  getEntryStatus,
} from '@/lib/services/luckyDraw/entryService';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';
import { ValidationError, ConflictError, NotFoundError } from '@/lib/errors';
import { createCampaign, createOpenDraw, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());

// Store fixture is at Mumbai (19.076, 72.8777). This point is ~150 m away.
const NEAR = { latitude: 19.0772, longitude: 72.8785 };
// Delhi, ~1150 km away.
const FAR = { latitude: 28.6139, longitude: 77.209 };

const submit = (campaign, overrides = {}) => ({
  campaignId: String(campaign._id),
  customerName: 'Asha Verma',
  customerMobile: '9876543210',
  billAmount: 1200,
  consent: true,
  ...NEAR,
  ...overrides,
});

describe('findNearestStore', () => {
  const stores = [
    { storeName: 'A', latitude: 19.076, longitude: 72.8777, status: 'active' },
    { storeName: 'B', latitude: 19.2, longitude: 72.9, status: 'active' },
    { storeName: 'Closed', latitude: 19.0772, longitude: 72.8785, status: 'inactive' },
  ];
  it('returns the closest active store with a rounded distance', () => {
    const nearest = findNearestStore(stores, 19.0772, 72.8785);
    expect(nearest.store.storeName).toBe('A');
    expect(Number.isInteger(nearest.distance)).toBe(true);
  });
  it('returns null when nothing is active', () => {
    expect(findNearestStore([{ status: 'inactive', latitude: 1, longitude: 1 }], 1, 1)).toBeNull();
  });
});

describe('createEntry', () => {
  it('grants entries from the tier and attaches the entry to the open draw', async () => {
    const campaign = await createCampaign();

    const result = await createEntry(submit(campaign));

    expect(result.entriesGranted).toBe(3);
    expect(result.totalEntries).toBe(3);
    expect(result.capped).toBe(false);
    expect(result.campaignName).toBe(campaign.name);
    const draw = await LuckyDraw.findOne({ campaignId: campaign._id, status: 'scheduled' });
    expect(String(result.entry.drawId)).toBe(String(draw._id));
    expect(new Date(result.drawDate)).toEqual(draw.drawDate);
    expect(result.entry.distanceMeters).toBeLessThan(2000);
  });

  it('records which bill range the entry fell in', async () => {
    const campaign = await createCampaign();
    const small = await createEntry(submit(campaign, { billAmount: 300 }));
    const big = await createEntry(submit(campaign, { billAmount: 1300, customerMobile: '9876543211' }));
    expect(small.entry.tierIndex).toBe(0);
    expect(big.entry.tierIndex).toBe(1);
  });

  it('accumulates entries across bills from the same customer', async () => {
    const campaign = await createCampaign();
    await createEntry(submit(campaign, { billAmount: 1200 }));
    const second = await createEntry(submit(campaign, { billAmount: 300 }));
    expect(second.entriesGranted).toBe(1);
    expect(second.totalEntries).toBe(4);
    expect(await LuckyDrawEntry.countDocuments({ campaignId: campaign._id })).toBe(2);
  });

  it('rejects a customer who is not near a participating store', async () => {
    const campaign = await createCampaign();
    await expect(createEntry(submit(campaign, FAR))).rejects.toThrow(/not valid at your current location/);
    expect(await LuckyDrawEntry.countDocuments()).toBe(0);
  });

  it('requires a location unless the check is skipped', async () => {
    const campaign = await createCampaign();
    await expect(createEntry(submit(campaign, { latitude: undefined, longitude: undefined }))).rejects.toThrow(/location/i);
    const result = await createEntry(submit(campaign, { latitude: undefined, longitude: undefined, skipLocationCheck: true }));
    expect(result.entry.distanceMeters).toBeNull();
    expect(String(result.entry.storeId)).toBe(String(campaign.assignedStores[0].storeId));
  });

  it('rejects a bill below the first tier without creating an entry', async () => {
    const campaign = await createCampaign({
      entryTiers: [{ minAmount: 500, maxAmount: null, entriesGranted: 1 }],
    });
    await expect(createEntry(submit(campaign, { billAmount: 100 }))).rejects.toThrow(/minimum bill amount.*500/);
    expect(await LuckyDrawEntry.countDocuments()).toBe(0);
  });

  it('rejects a bill that falls in a gap between tiers without creating an entry', async () => {
    const campaign = await createCampaign({
      entryTiers: [
        { minAmount: 0, maxAmount: 500, entriesGranted: 1 },
        { minAmount: 1000, maxAmount: null, entriesGranted: 2 },
      ],
    });
    await expect(createEntry(submit(campaign, { billAmount: 750 }))).rejects.toThrow(/does not qualify/);
    expect(await LuckyDrawEntry.countDocuments()).toBe(0);
  });

  it('rejects an immediate duplicate of the same bill, but allows it after a minute', async () => {
    const campaign = await createCampaign();
    await createEntry(submit(campaign));
    await expect(createEntry(submit(campaign))).rejects.toThrow(ConflictError);
    await expect(createEntry(submit(campaign))).rejects.toThrow(/just submitted/);
    const later = new Date(Date.now() + 61 * 1000);
    await expect(createEntry(submit(campaign), later)).resolves.toBeDefined();
  });

  it('caps a customer at the campaign limit, granting only what is left', async () => {
    const campaign = await createCampaign({ maxEntriesPerCustomerPerPeriod: 5 });
    const first = await createEntry(submit(campaign, { billAmount: 1200 })); // 3
    expect(first.capped).toBe(false);
    const second = await createEntry(submit(campaign, { billAmount: 1500 })); // would be 3, only 2 left
    expect(second.entriesGranted).toBe(2);
    expect(second.capped).toBe(true);
    expect(second.totalEntries).toBe(5);
    await expect(createEntry(submit(campaign, { billAmount: 1800 }))).rejects.toThrow(/limit of 5 entries/);
  });

  it('applies the cap per customer, not across customers', async () => {
    const campaign = await createCampaign({ maxEntriesPerCustomerPerPeriod: 3 });
    await createEntry(submit(campaign, { customerMobile: '9000000001' }));
    await expect(createEntry(submit(campaign, { customerMobile: '9000000002' }))).resolves.toBeDefined();
  });

  it.each([
    ['a draft campaign', { status: 'draft' }],
    ['a paused campaign', { status: 'paused' }],
    ['an ended campaign', { status: 'ended' }],
    ['a campaign that has not started', { startDate: new Date(Date.now() + DAY), endDate: new Date(Date.now() + 5 * DAY) }],
    ['a campaign past its end date', { startDate: new Date(Date.now() - 5 * DAY), endDate: new Date(Date.now() - DAY) }],
  ])('rejects entries for %s', async (_label, patch) => {
    const campaign = await createCampaign(patch);
    await expect(createEntry(submit(campaign))).rejects.toThrow(ConflictError);
  });

  it.each([
    ['a short name', { customerName: 'A' }, /name/i],
    ['a bad mobile', { customerMobile: '12345' }, /10 digits/],
    ['a negative bill', { billAmount: -1 }, /bill amount/i],
    ['a string bill', { billAmount: '1200' }, /bill amount/i],
    ['no consent', { consent: false }, /accept/i],
  ])('rejects %s', async (_label, patch, message) => {
    const campaign = await createCampaign();
    await expect(createEntry(submit(campaign, patch))).rejects.toThrow(ValidationError);
    await expect(createEntry(submit(campaign, patch))).rejects.toThrow(message);
  });

  it('treats unknown and malformed campaign ids as not found', async () => {
    await expect(createEntry({ ...submit({ _id: newId() }) })).rejects.toThrow(NotFoundError);
    await expect(createEntry({ ...submit({ _id: 'nope' }) })).rejects.toThrow(NotFoundError);
  });
});

describe('shouldSendConfirmation', () => {
  it('is true for a first entry and false once more entries arrive within 10 minutes', async () => {
    const campaign = await createCampaign();
    const first = await createEntry(submit(campaign, { billAmount: 1200 }));
    const args = { drawId: first.entry.drawId, customerPhone: '9876543210' };
    expect(await shouldSendConfirmation(args)).toBe(true);
    await createEntry(submit(campaign, { billAmount: 1300 }));
    expect(await shouldSendConfirmation(args)).toBe(false);
  });

  it('is true again after the window passes', async () => {
    const campaign = await createCampaign();
    const first = await createEntry(submit(campaign, { billAmount: 1200 }));
    await createEntry(submit(campaign, { billAmount: 1300 }));
    const args = { drawId: first.entry.drawId, customerPhone: '9876543210', now: new Date(Date.now() + 11 * 60 * 1000) };
    expect(await shouldSendConfirmation(args)).toBe(true);
  });
});

describe('getEntryStatus', () => {
  it('shows the current date, the previous date, the customer\'s total and the notice', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    const previous = new Date(Date.now() + 3 * DAY);
    await LuckyDraw.updateOne(
      { _id: draw._id },
      {
        $push: {
          dateHistory: {
            previousDate: previous,
            newDate: draw.drawDate,
            changedByAccountId: campaign.merchantId,
            changedAt: new Date(),
          },
        },
      },
    );
    await createEntry(submit(campaign, { billAmount: 1200 }));

    const status = await getEntryStatus({ campaignId: String(campaign._id), customerMobile: '9876543210' });

    expect(status.campaignName).toBe(campaign.name);
    expect(status.drawStatus).toBe('scheduled');
    expect(new Date(status.drawDate)).toEqual(draw.drawDate);
    expect(new Date(status.previousDrawDate)).toEqual(previous);
    expect(status.totalEntries).toBe(3);
    expect(status.notice).toBe(DATE_CHANGE_NOTICE);
    expect(status.wins).toEqual([]);
  });

  it('does not report a moved entries-close date as the previous draw date', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign);
    const stamp = { changedByAccountId: campaign.merchantId, changedAt: new Date() };
    const earlierDraw = new Date(Date.now() + 2 * DAY);
    await LuckyDraw.updateOne(
      { _id: draw._id },
      {
        $push: {
          dateHistory: {
            $each: [
              { kind: 'reveal', previousDate: earlierDraw, newDate: draw.drawDate, ...stamp },
              { kind: 'entries_close', previousDate: new Date(Date.now() + DAY), newDate: campaign.endDate, ...stamp },
            ],
          },
        },
      },
    );

    const status = await getEntryStatus({ campaignId: String(campaign._id), customerMobile: '9876543210' });
    expect(new Date(status.previousDrawDate)).toEqual(earlierDraw);

    await LuckyDraw.updateOne({ _id: draw._id }, { $pop: { dateHistory: -1 } });
    const onlyClose = await getEntryStatus({ campaignId: String(campaign._id), customerMobile: '9876543210' });
    expect(onlyClose.previousDrawDate).toBeNull();
  });

  it('reports wins without ever exposing the claim code', async () => {
    const campaign = await createCampaign();
    const draw = await createOpenDraw(campaign, { status: 'completed' });
    await LuckyDrawWinner.create({
      drawId: draw._id,
      campaignId: campaign._id,
      merchantId: campaign.merchantId,
      rank: 1,
      entryId: newId(),
      customerName: 'Asha Verma',
      customerPhone: '9876543210',
      prizeDescription: 'Smart TV',
      claimCode: 'SECRET99',
      status: 'notified',
      expiresAt: new Date(Date.now() + DAY),
    });

    const status = await getEntryStatus({ campaignId: String(campaign._id), customerMobile: '9876543210' });

    expect(status.wins).toHaveLength(1);
    expect(status.wins[0]).toMatchObject({ rank: 1, prizeDescription: 'Smart TV', status: 'notified' });
    expect(JSON.stringify(status)).not.toContain('SECRET99');
    expect(Object.keys(status.wins[0])).not.toContain('claimCode');
  });

  it('rejects a bad mobile and an unknown campaign', async () => {
    const campaign = await createCampaign();
    await expect(getEntryStatus({ campaignId: String(campaign._id), customerMobile: '123' })).rejects.toThrow(ValidationError);
    await expect(getEntryStatus({ campaignId: String(newId()), customerMobile: '9876543210' })).rejects.toThrow(NotFoundError);
  });
});
