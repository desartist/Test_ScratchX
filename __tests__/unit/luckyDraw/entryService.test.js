import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import Store from '@/models/storeModel';
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
  customerEmail: 'asha@example.com',
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
  it('grants one numbered entry and attaches it to the open draw', async () => {
    const campaign = await createCampaign();

    const result = await createEntry(submit(campaign));

    expect(result).toMatchObject({ entriesGranted: 1, totalEntries: 1, entryNumber: 1, campaignName: campaign.name, storeName: 'Main Store' });
    expect(result.entry).toMatchObject({ source: 'qr', entryNumber: 1, entriesGranted: 1 });
    const draw = await LuckyDraw.findOne({ campaignId: campaign._id, status: 'scheduled' });
    expect(String(result.entry.drawId)).toBe(String(draw._id));
    expect(new Date(result.drawDate)).toEqual(draw.drawDate);
    expect(result.entry.distanceMeters).toBeLessThan(2000);
    expect((await LuckyDrawCampaign.findById(campaign._id)).entryCounter).toBe(1);
  });

  it('accumulates entries across bills from the same customer', async () => {
    const campaign = await createCampaign();
    await createEntry(submit(campaign, { billAmount: 1200 }));
    const second = await createEntry(submit(campaign, { billAmount: 300 }));
    expect(second.entriesGranted).toBe(1);
    expect(second.totalEntries).toBe(2);
    expect(await LuckyDrawEntry.countDocuments({ campaignId: campaign._id })).toBe(2);
  });

  it('rejects a customer who is not near a participating store, saying how far they are', async () => {
    const campaign = await createCampaign();
    await expect(createEntry(submit(campaign, FAR))).rejects.toThrow(/^It looks like you're about \d+m away from the store\. Head a little closer — you need to be within 250m to enter\.$/);
    expect(await LuckyDrawEntry.countDocuments()).toBe(0);
  });

  it('requires a location unless the check is skipped', async () => {
    const campaign = await createCampaign();
    await expect(createEntry(submit(campaign, { latitude: undefined, longitude: undefined }))).rejects.toThrow(/location/i);
    const result = await createEntry(submit(campaign, { latitude: undefined, longitude: undefined, skipLocationCheck: true }));
    expect(result.entry.distanceMeters).toBeNull();
    expect(String(result.entry.storeId)).toBe(String(campaign.assignedStores[0].storeId));
  });

  it('rejects an immediate duplicate of the same bill, but allows it after a minute', async () => {
    const campaign = await createCampaign();
    await createEntry(submit(campaign));
    await expect(createEntry(submit(campaign))).rejects.toThrow(ConflictError);
    await expect(createEntry(submit(campaign))).rejects.toThrow(/just submitted/);
    const later = new Date(Date.now() + 61 * 1000);
    await expect(createEntry(submit(campaign), later)).resolves.toBeDefined();
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

  it('accepts a bill equal to the minimum and refuses one rupee less', async () => {
    const campaign = await createCampaign({ minBillAmount: 1500 });
    await expect(createEntry(submit(campaign, { billAmount: 1499 }))).rejects.toThrow('Bills of ₹1,500 or more can enter this draw');
    expect(await LuckyDrawEntry.countDocuments()).toBe(0);
    await expect(createEntry(submit(campaign, { billAmount: 1500 }))).resolves.toMatchObject({ entriesGranted: 1 });
  });

  it('accepts a ₹0 bill when the minimum is 0', async () => {
    const campaign = await createCampaign({ minBillAmount: 0 });
    await expect(createEntry(submit(campaign, { billAmount: 0 }))).resolves.toMatchObject({ entryNumber: 1 });
  });

  it('hands out different numbers to entries saved at the same moment', async () => {
    const campaign = await createCampaign();
    const results = await Promise.all(
      ['9000000001', '9000000002', '9000000003', '9000000004', '9000000005'].map((customerMobile) => createEntry(submit(campaign, { customerMobile }))),
    );
    expect(results.map((r) => r.entryNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('refuses QR entries for a physical draw', async () => {
    const campaign = await createCampaign({ drawType: 'physical' });
    await expect(createEntry(submit(campaign))).rejects.toThrow(/store counter/);
  });

  it('takes staff entries at the chosen store without a location check', async () => {
    const campaign = await createCampaign({ drawType: 'physical' });
    const staffId = newId();
    const result = await createEntry({
      ...submit(campaign, FAR),
      source: 'staff',
      storeId: String(campaign.assignedStores[0].storeId),
      addedByAccountId: staffId,
    });
    expect(result.entry).toMatchObject({ source: 'staff', distanceMeters: null });
    expect(String(result.entry.addedByAccountId)).toBe(String(staffId));
  });

  it('refuses staff entries for a digital draw, and a store outside the draw', async () => {
    const digital = await createCampaign({ drawType: 'digital' });
    await expect(createEntry({ ...submit(digital), source: 'staff', storeId: String(digital.assignedStores[0].storeId) })).rejects.toThrow(/only takes entries by QR/);
    const live = await createCampaign({ drawType: 'live_online' });
    await expect(createEntry({ ...submit(live), source: 'staff', storeId: String(newId()) })).rejects.toThrow(/Choose one of the stores/);
  });

  it('ignores a store without a location when checking where a QR customer is', async () => {
    const data = await createCampaign({ drawType: 'live_online' });
    const located = data.assignedStores[0].toObject();
    await LuckyDrawCampaign.updateOne(
      { _id: data._id },
      { $set: { assignedStores: [{ ...located, storeId: newId(), storeName: 'No map', latitude: null, longitude: null }, located] } },
    );
    const result = await createEntry(submit(data));
    expect(result.storeName).toBe('Main Store');
  });
});

// A point `meters` due north of the fixture store (19.076, 72.8777).
const north = (meters) => ({ latitude: 19.076 + meters / 111320, longitude: 72.8777 });
const PUNE = { latitude: 18.5204, longitude: 73.8567 };
const store = (storeName, { latitude, longitude }) => ({ storeId: newId(), storeName, city: 'X', latitude, longitude, status: 'active' });

describe('createEntry: geofence like the scratch campaign flow', () => {
  it('allows 250 m, plus the phone\'s GPS accuracy capped at 200 m', async () => {
    const campaign = await createCampaign();
    await expect(createEntry(submit(campaign, north(350)))).rejects.toThrow(/about 350m away .* within 250m to enter/);

    const widened = await createEntry(submit(campaign, { ...north(350), accuracy: 150, customerMobile: '9876500010' }));
    expect(widened.entry.distanceMeters).toBe(350);

    await expect(createEntry(submit(campaign, { ...north(500), accuracy: 5000, customerMobile: '9876500011' }))).rejects.toThrow(/about 4\d\dm away .* within 450m to enter/);
    await expect(createEntry(submit(campaign, { ...north(240), accuracy: -30, customerMobile: '9876500012' }))).resolves.toBeDefined();
  });

  it('checks a retail customer against the store\'s current location, not the one saved at publishing', async () => {
    const campaign = await createCampaign();
    const { storeId } = campaign.assignedStores[0];
    const moved = { latitude: 19.1, longitude: 72.9 };
    await Store.collection.insertOne({ _id: storeId, ...moved });

    await expect(createEntry(submit(campaign, north(20)))).rejects.toThrow(/away from the store/);
    const result = await createEntry(submit(campaign, { ...moved, customerMobile: '9876500020' }));
    expect(result.entry.distanceMeters).toBe(0);
  });

  it('falls back to the saved location when the store has no current one', async () => {
    const campaign = await createCampaign();
    await Store.collection.insertOne({ _id: campaign.assignedStores[0].storeId, latitude: null, longitude: null });
    await expect(createEntry(submit(campaign, north(20)))).resolves.toBeDefined();
  });

  it('says the QR is not valid here when no store of the draw has a location', async () => {
    const campaign = await createCampaign({ assignedStores: [store('No GPS', { latitude: null, longitude: null })] });
    await expect(createEntry(submit(campaign))).rejects.toThrow(/not valid at your current location/);
  });

  it('pins a store\'s own QR to that store, for retail and wholesale alike', async () => {
    const mumbai = store('Mumbai', { latitude: 19.076, longitude: 72.8777 });
    const pune = store('Pune', PUNE);
    const campaign = await createCampaign({ assignedStores: [mumbai, pune] });

    // Retail: near Mumbai but holding Pune's QR is out of range of Pune.
    await expect(createEntry(submit(campaign, { storeId: String(pune.storeId) }))).rejects.toThrow(/away from the store/);
    const atMumbai = await createEntry(submit(campaign, { storeId: String(mumbai.storeId), customerMobile: '9876500030' }));
    expect(String(atMumbai.entry.storeId)).toBe(String(mumbai.storeId));
    // Without a store QR, the nearest store wins.
    const atPune = await createEntry(submit(campaign, { ...PUNE, customerMobile: '9876500031' }));
    expect(String(atPune.entry.storeId)).toBe(String(pune.storeId));
    // A store that is not in the draw.
    await expect(createEntry(submit(campaign, { storeId: String(newId()), customerMobile: '9876500032' }))).rejects.toThrow('This QR code is not for a store in this draw.');

    // Wholesale: no distance check, the QR's store or else the first store.
    const wholesale = (o) => submit(campaign, { ...FAR, skipLocationCheck: true, ...o });
    const pinned = await createEntry(wholesale({ storeId: String(pune.storeId), customerMobile: '9876500033' }));
    expect(String(pinned.entry.storeId)).toBe(String(pune.storeId));
    expect(pinned.entry.distanceMeters).toBeNull();
    expect(pinned.entry.customerLatitude).toBe(FAR.latitude);
    const first = await createEntry(wholesale({ customerMobile: '9876500034' }));
    expect(String(first.entry.storeId)).toBe(String(mumbai.storeId));
    await expect(createEntry(wholesale({ storeId: String(newId()), customerMobile: '9876500035' }))).rejects.toThrow('This QR code is not for a store in this draw.');
  });
});

describe('createEntry: email and bill', () => {
  it('stores the email in lower case and needs a valid one', async () => {
    const campaign = await createCampaign();
    const result = await createEntry(submit(campaign, { customerEmail: ' Asha.Verma@Example.COM ' }));
    expect(result.entry.customerEmail).toBe('asha.verma@example.com');
    await expect(createEntry(submit(campaign, { customerEmail: undefined, customerMobile: '9876500001' }))).rejects.toThrow(/valid email/);
    await expect(createEntry(submit(campaign, { customerEmail: 'asha@', customerMobile: '9876500002' }))).rejects.toThrow(ValidationError);
  });

  it('takes a QR entry without a bill, and still refuses one that is given under the minimum', async () => {
    const campaign = await createCampaign({ minBillAmount: 1000 });
    const result = await createEntry(submit(campaign, { billAmount: undefined }));
    expect(result.entry.billAmount).toBeNull();
    await expect(createEntry(submit(campaign, { billAmount: 999, customerMobile: '9876500003' }))).rejects.toThrow(/₹1,000 or more/);
  });

  it('treats a second bill-less QR entry from the same number within a minute as a double submit', async () => {
    const campaign = await createCampaign();
    await createEntry(submit(campaign, { billAmount: undefined }));
    await expect(createEntry(submit(campaign, { billAmount: undefined }))).rejects.toThrow(/just submitted/);
    await expect(createEntry(submit(campaign, { billAmount: undefined }), new Date(Date.now() + 61 * 1000))).resolves.toBeDefined();
  });

  it('needs the bill on a staff entry', async () => {
    const campaign = await createCampaign({ drawType: 'physical' });
    const staff = { source: 'staff', storeId: String(campaign.assignedStores[0].storeId), latitude: undefined, longitude: undefined };
    await expect(createEntry(submit(campaign, { ...staff, billAmount: undefined }))).rejects.toThrow(/bill amount/i);
    await expect(createEntry(submit(campaign, { ...staff, customerEmail: '' }))).rejects.toThrow(/email address/);
  });
});

describe('confirmEntry', () => {
  it('reports the SMS and the email separately, once per number in 10 minutes', async () => {
    const { confirmEntry } = require('@/lib/services/luckyDraw/entryService');
    const campaign = await createCampaign();
    const first = await createEntry(submit(campaign));
    const args = { drawId: first.drawId, customerPhone: '9876543210', customerEmail: 'asha@example.com', campaignName: campaign.name, entryNumber: 1, drawDate: first.drawDate };
    expect(await confirmEntry(args)).toEqual({ smsSent: true, emailSent: true });
    await createEntry(submit(campaign, { billAmount: 1300 }));
    expect(await confirmEntry(args)).toEqual({ smsSent: false, emailSent: false });
  });
});

describe('sendEntryConfirmation', () => {
  it('texts the first entry only and never throws', async () => {
    const { sendEntryConfirmation } = require('@/lib/services/luckyDraw/entryService');
    const campaign = await createCampaign();
    const first = await createEntry(submit(campaign));
    const args = { drawId: first.drawId, customerPhone: '9876543210', campaignName: campaign.name, drawDate: first.drawDate };
    expect(await sendEntryConfirmation(args)).toBe(true);
    await createEntry(submit(campaign, { billAmount: 1300 }));
    expect(await sendEntryConfirmation(args)).toBe(false);
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
    expect(status.totalEntries).toBe(1);
    expect(status.revealInProgress).toBe(false);
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

describe('getEntryStatus after the draw', () => {
  it('still counts the entries once the draw has finished, and says when a live reveal is under way', async () => {
    const campaign = await createCampaign();
    const entry = await createEntry(submit(campaign));
    await LuckyDraw.updateOne({ _id: entry.drawId }, { $set: { status: 'completed', reveal: { revealedCount: 0, startedAt: new Date() } } });
    await LuckyDrawCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'ended' } });

    const during = await getEntryStatus({ campaignId: String(campaign._id), customerMobile: '9876543210' });
    expect(during).toMatchObject({ campaignStatus: 'ended', drawStatus: null, totalEntries: 1, revealInProgress: true, wins: [] });

    await LuckyDraw.updateOne({ _id: entry.drawId }, { $set: { 'reveal.completedAt': new Date() } });
    const after = await getEntryStatus({ campaignId: String(campaign._id), customerMobile: '9876543210' });
    expect(after).toMatchObject({ totalEntries: 1, revealInProgress: false });
  });
});
