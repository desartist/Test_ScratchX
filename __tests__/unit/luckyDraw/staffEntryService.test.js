jest.mock('@/lib/subscriptionAccessGuard', () => ({ checkPlanAccess: jest.fn().mockResolvedValue({ allowed: true, plan: { limits: { maxCampaigns: 10 } } }) }));
jest.mock('@/lib/services/luckyDraw/notifier', () => {
  const actual = jest.requireActual('@/lib/services/luckyDraw/notifier');
  return { ...actual, sendSms: jest.fn().mockResolvedValue({ success: true }) };
});

import Account from '@/models/accountModel';
import LuckyDraw from '@/models/luckyDrawModel';
import { addStaffEntry, listStaffDraws } from '@/lib/services/luckyDraw/staffEntryService';
import { listEntries } from '@/lib/services/luckyDraw/entryListService';
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';
import { createCampaign, newId, DAY } from '../../helpers/luckyDrawFixtures';

beforeAll(() => LuckyDraw.init());

const store = (name) => ({
  storeId: newId(), storeName: name, storeCode: name.toUpperCase(), address: '1 Road', city: 'Mumbai', state: 'MH', pincode: '400001',
  latitude: 19.076, longitude: 72.8777, status: 'active',
});

let emailSeq = 0;
// resolveMerchantId walks parentId up to a Merchant account, so the merchant must exist too.
async function staffOf(merchantId, role, storeId = null) {
  await Account.collection.updateOne(
    { _id: merchantId },
    { $setOnInsert: { role: 'Merchant', email: `merchant-${merchantId}@test.local` } },
    { upsert: true },
  );
  const _id = newId();
  emailSeq += 1;
  await Account.collection.insertOne({ _id, role, parentId: merchantId, storeId, email: `staff${emailSeq}@test.local` });
  return { _id, role, parentId: merchantId, storeId };
}

const entry = (overrides = {}) => ({ customerName: 'Ravi Kumar', customerMobile: '9811111111', billAmount: 1500, consent: true, ...overrides });

async function physicalDraw(overrides = {}) {
  const andheri = store('Andheri');
  const bandra = store('Bandra');
  const campaign = await createCampaign({ drawType: 'physical', minBillAmount: 1000, assignedStores: [andheri, bandra], ...overrides });
  return { campaign, andheri, bandra, merchant: { _id: campaign.merchantId, role: 'Merchant' } };
}

describe('addStaffEntry', () => {
  it('records a store staff entry at their own store', async () => {
    const { campaign, bandra } = await physicalDraw();
    const staff = await staffOf(campaign.merchantId, 'Store_Staff', bandra.storeId);

    const result = await addStaffEntry({ account: staff, campaignId: String(campaign._id), ...entry() });

    expect(result).toMatchObject({ entryNumber: 1, storeName: 'Bandra' });
    expect(result.entry).toMatchObject({ source: 'staff' });
    expect(String(result.entry.addedByAccountId)).toBe(String(staff._id));
  });

  it('ignores a store chosen by store staff and refuses staff of a store outside the draw', async () => {
    const { campaign, andheri } = await physicalDraw();
    const staff = await staffOf(campaign.merchantId, 'Store_Manager', andheri.storeId);
    const result = await addStaffEntry({ account: staff, campaignId: String(campaign._id), ...entry(), storeId: String(newId()) });
    expect(result.storeName).toBe('Andheri');

    const outsider = await staffOf(campaign.merchantId, 'Store_Staff', newId());
    await expect(addStaffEntry({ account: outsider, campaignId: String(campaign._id), ...entry() })).rejects.toThrow('Your store is not part of this Lucky Draw');
  });

  it('lets the merchant and managers choose the store, and asks for one when there are several', async () => {
    const { campaign, merchant, andheri } = await physicalDraw();
    await expect(addStaffEntry({ account: merchant, campaignId: String(campaign._id), ...entry() })).rejects.toThrow('Choose the store this bill is from');
    const manager = await staffOf(campaign.merchantId, 'Manager');
    const result = await addStaffEntry({ account: manager, campaignId: String(campaign._id), ...entry(), storeId: String(andheri.storeId) });
    expect(result.storeName).toBe('Andheri');
  });

  it('uses the only store when the draw has one', async () => {
    const single = store('Powai');
    const campaign = await createCampaign({ drawType: 'live_online', assignedStores: [single] });
    const result = await addStaffEntry({ account: { _id: campaign.merchantId, role: 'Merchant' }, campaignId: String(campaign._id), ...entry() });
    expect(result.storeName).toBe('Powai');
  });

  it('applies the minimum bill and refuses digital draws', async () => {
    const { campaign, merchant, andheri } = await physicalDraw();
    await expect(addStaffEntry({ account: merchant, campaignId: String(campaign._id), ...entry({ billAmount: 999 }), storeId: String(andheri.storeId) })).rejects.toThrow(ValidationError);
    const digital = await createCampaign({ drawType: 'digital' });
    await expect(addStaffEntry({ account: { _id: digital.merchantId, role: 'Merchant' }, campaignId: String(digital._id), ...entry() })).rejects.toThrow(/only takes entries by QR/);
  });

  it("hides other merchants' draws and refuses other roles", async () => {
    const { campaign } = await physicalDraw();
    await expect(addStaffEntry({ account: { _id: newId(), role: 'Merchant' }, campaignId: String(campaign._id), ...entry() })).rejects.toThrow(NotFoundError);
    await expect(addStaffEntry({ account: { _id: newId(), role: 'Distributor' }, campaignId: String(campaign._id), ...entry() })).rejects.toThrow(AuthorizationError);
  });
});

describe('listStaffDraws', () => {
  it('lists open physical and live online draws, only those at a store role’s own store', async () => {
    const { campaign, andheri, bandra } = await physicalDraw({ name: 'Open physical' });
    await createCampaign({ merchantId: campaign.merchantId, drawType: 'digital', name: 'Digital' });
    await createCampaign({ merchantId: campaign.merchantId, drawType: 'physical', name: 'Closed', startDate: new Date(Date.now() - 5 * DAY), endDate: new Date(Date.now() - DAY) });
    await createCampaign({ merchantId: campaign.merchantId, drawType: 'live_online', name: 'Elsewhere', assignedStores: [store('Thane')] });

    const staff = await staffOf(campaign.merchantId, 'Store_Staff', bandra.storeId);
    await addStaffEntry({ account: staff, campaignId: String(campaign._id), ...entry() });
    const manager = await staffOf(campaign.merchantId, 'Manager');
    await addStaffEntry({ account: manager, campaignId: String(campaign._id), ...entry({ customerMobile: '9822222222' }), storeId: String(andheri.storeId) });

    const forStaff = await listStaffDraws(staff);
    expect(forStaff.map((d) => [d.name, d.entryCount])).toEqual([['Open physical', 1]]);
    expect(forStaff[0]).toMatchObject({ drawType: 'physical', minBillAmount: 1000 });
    expect(forStaff[0].stores.map((s) => s.storeName)).toEqual(['Bandra']);

    const forManager = await listStaffDraws(manager);
    expect(forManager.map((d) => d.name).sort()).toEqual(['Elsewhere', 'Open physical']);
    expect(forManager.find((d) => d.name === 'Open physical')).toMatchObject({ entryCount: 2 });
    expect(forManager.find((d) => d.name === 'Open physical').stores.map((s) => s.storeName)).toEqual(['Andheri', 'Bandra']);
  });

  it('returns nothing for a store role without a store', async () => {
    const { campaign } = await physicalDraw();
    const staff = await staffOf(campaign.merchantId, 'Store_Staff', null);
    expect(await listStaffDraws(staff)).toEqual([]);
  });
});

describe('listEntries', () => {
  it('lists the newest entries first and finds them by number, name or phone', async () => {
    const { campaign, merchant, andheri } = await physicalDraw();
    const add = (o) => addStaffEntry({ account: merchant, campaignId: String(campaign._id), storeId: String(andheri.storeId), ...entry(o) });
    await add({ customerName: 'Priya Shah', customerMobile: '9800000011' });
    await add({ customerName: 'Kunal Desai', customerMobile: '9800000033' });
    await add({ customerName: 'Asha (Verma)', customerMobile: '9800000056' });

    const all = await listEntries(String(campaign.merchantId), String(campaign._id));
    expect(all.total).toBe(3);
    expect(all.entries.map((e) => e.entryNumber)).toEqual([3, 2, 1]);
    expect(all.entries[0]).toMatchObject({ customerName: 'Asha (Verma)', source: 'staff', storeName: 'Andheri' });

    const ids = async (q) => (await listEntries(String(campaign.merchantId), String(campaign._id), { q })).entries.map((e) => e.entryNumber);
    expect(await ids('#2')).toEqual([2]);
    expect(await ids('priya')).toEqual([1]);
    expect(await ids('0056')).toEqual([3]);
    expect(await ids('(verma')).toEqual([3]);
  });

  it("hides other merchants' entries", async () => {
    const { campaign } = await physicalDraw();
    await expect(listEntries(String(newId()), String(campaign._id))).rejects.toThrow(NotFoundError);
  });
});
