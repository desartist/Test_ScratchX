import Account from '@/models/accountModel';
import LuckyDrawWinner from '@/models/luckyDrawWinnerModel';
import {
  resolveMerchantId,
  redeemClaimCode,
  expireStaleWinners,
} from '@/lib/services/luckyDraw/redemptionService';
import { AuthorizationError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { createCampaign, newId, DAY } from '../../helpers/luckyDrawFixtures';

// Raw insert skips Account validation, but the unique email index still applies: give every account its own email.
const insertAccount = async (doc) => {
  const account = { email: `acct-${doc._id}@example.com`, ...doc };
  await Account.collection.insertOne(account);
  return account;
};

async function seedWinner(overrides = {}) {
  const campaign = await createCampaign();
  const winner = await LuckyDrawWinner.create({
    drawId: newId(),
    campaignId: campaign._id,
    merchantId: campaign.merchantId,
    rank: 1,
    entryId: newId(),
    customerName: 'Asha Verma',
    customerPhone: '9876543210',
    prizeDescription: 'Smart TV',
    claimCode: 'ABCD2345',
    status: 'notified',
    expiresAt: new Date(Date.now() + 10 * DAY),
    ...overrides,
  });
  return { campaign, winner };
}

const merchantAccount = (campaign) => ({ _id: campaign.merchantId, role: 'Merchant' });

describe('resolveMerchantId', () => {
  it('returns the account itself for a merchant', async () => {
    const id = newId();
    expect(await resolveMerchantId({ _id: id, role: 'Merchant' })).toBe(String(id));
  });

  it('walks up Store_Staff -> Store_Manager -> Manager -> Merchant', async () => {
    const merchant = await insertAccount({ _id: newId(), role: 'Merchant' });
    const manager = await insertAccount({ _id: newId(), role: 'Manager', parentId: merchant._id });
    const storeManager = await insertAccount({ _id: newId(), role: 'Store_Manager', parentId: manager._id });
    const staff = { _id: newId(), role: 'Store_Staff', parentId: storeManager._id };
    expect(await resolveMerchantId(staff)).toBe(String(merchant._id));
  });

  it('returns null when there is no parent or the chain never reaches a merchant', async () => {
    expect(await resolveMerchantId({ _id: newId(), role: 'Store_Staff' })).toBeNull();
    const distributor = await insertAccount({ _id: newId(), role: 'Distributor' });
    expect(await resolveMerchantId({ _id: newId(), role: 'Store_Staff', parentId: distributor._id })).toBeNull();
    expect(await resolveMerchantId({ _id: newId(), role: 'Store_Staff', parentId: newId() })).toBeNull();
  });
});

describe('redeemClaimCode', () => {
  it('lets the merchant redeem a notified winner and records who and when', async () => {
    const { campaign, winner } = await seedWinner();
    const now = new Date();

    const result = await redeemClaimCode({ claimCode: 'ABCD2345', account: merchantAccount(campaign), now });

    expect(result).toMatchObject({ status: 'redeemed', rank: 1, prizeDescription: 'Smart TV', customerName: 'Asha Verma' });
    expect(result.redeemedAt).toEqual(now);
    const stored = await LuckyDrawWinner.findById(winner._id);
    expect(stored.status).toBe('redeemed');
    expect(String(stored.redeemedByAccountId)).toBe(String(campaign.merchantId));
  });

  it('normalises case and whitespace', async () => {
    const { campaign } = await seedWinner();
    await expect(
      redeemClaimCode({ claimCode: '  abcd2345 ', account: merchantAccount(campaign) }),
    ).resolves.toMatchObject({ status: 'redeemed' });
  });

  it('lets a Store_Staff member under the merchant redeem, at a store of the campaign', async () => {
    const { campaign } = await seedWinner();
    const manager = await insertAccount({ _id: newId(), role: 'Manager', parentId: campaign.merchantId });
    await insertAccount({ _id: campaign.merchantId, role: 'Merchant' });
    const staff = { _id: newId(), role: 'Store_Staff', parentId: manager._id };
    const storeId = campaign.assignedStores[0].storeId;

    const result = await redeemClaimCode({ claimCode: 'ABCD2345', account: staff, storeId });

    expect(String(result.redeemedAtStoreId)).toBe(String(storeId));
    expect(String(result.redeemedByAccountId)).toBe(String(staff._id));
  });

  it('uses the staff member\'s own store: recorded when it is one of the campaign\'s stores', async () => {
    const { campaign } = await seedWinner();
    await insertAccount({ _id: campaign.merchantId, role: 'Merchant' });
    const ownStore = campaign.assignedStores[0].storeId;
    const staff = { _id: newId(), role: 'Store_Staff', parentId: campaign.merchantId, storeId: ownStore };

    const result = await redeemClaimCode({ claimCode: 'ABCD2345', account: staff });

    expect(String(result.redeemedAtStoreId)).toBe(String(ownStore));
  });

  it('refuses store staff whose store is not part of the campaign, and leaves the prize unredeemed', async () => {
    const { campaign } = await seedWinner();
    await insertAccount({ _id: campaign.merchantId, role: 'Merchant' });
    const staff = { _id: newId(), role: 'Store_Staff', parentId: campaign.merchantId, storeId: newId() };

    await expect(redeemClaimCode({ claimCode: 'ABCD2345', account: staff })).rejects.toThrow(/not valid at that store/);
    expect((await LuckyDrawWinner.findOne({ claimCode: 'ABCD2345' })).status).toBe('notified');
  });

  it('does not apply a store rule to the merchant or a manager', async () => {
    const { campaign } = await seedWinner();
    const result = await redeemClaimCode({
      claimCode: 'ABCD2345',
      account: { _id: campaign.merchantId, role: 'Merchant', storeId: newId() },
    });
    expect(result.status).toBe('redeemed');
    expect(result.redeemedAtStoreId).toBeUndefined();
  });

  it('can redeem a winner whose SMS never went out (still pending)', async () => {
    const { campaign } = await seedWinner({ status: 'pending' });
    await expect(redeemClaimCode({ claimCode: 'ABCD2345', account: merchantAccount(campaign) })).resolves.toBeDefined();
  });

  it('rejects roles that may not redeem', async () => {
    const { campaign } = await seedWinner();
    await expect(
      redeemClaimCode({ claimCode: 'ABCD2345', account: { _id: campaign.merchantId, role: 'Distributor' } }),
    ).rejects.toThrow(AuthorizationError);
  });

  it('rejects staff who are not linked to any merchant', async () => {
    await seedWinner();
    await expect(
      redeemClaimCode({ claimCode: 'ABCD2345', account: { _id: newId(), role: 'Store_Staff' } }),
    ).rejects.toThrow(/not linked/);
  });

  it('does not reveal codes that belong to another merchant', async () => {
    await seedWinner();
    await expect(
      redeemClaimCode({ claimCode: 'ABCD2345', account: { _id: newId(), role: 'Merchant' } }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects unknown and empty codes', async () => {
    const { campaign } = await seedWinner();
    await expect(redeemClaimCode({ claimCode: 'ZZZZ9999', account: merchantAccount(campaign) })).rejects.toThrow(NotFoundError);
    await expect(redeemClaimCode({ claimCode: '   ', account: merchantAccount(campaign) })).rejects.toThrow(ValidationError);
    await expect(redeemClaimCode({ claimCode: undefined, account: merchantAccount(campaign) })).rejects.toThrow(ValidationError);
  });

  it('rejects a code that was already redeemed', async () => {
    const { campaign } = await seedWinner({ status: 'redeemed', redeemedAt: new Date() });
    await expect(redeemClaimCode({ claimCode: 'ABCD2345', account: merchantAccount(campaign) })).rejects.toThrow(/already redeemed/);
  });

  it('rejects an expired code, whether or not the expiry job has flagged it yet', async () => {
    const { campaign } = await seedWinner({ expiresAt: new Date(Date.now() - 1000) });
    await expect(redeemClaimCode({ claimCode: 'ABCD2345', account: merchantAccount(campaign) })).rejects.toThrow(/expired/);
    await LuckyDrawWinner.updateOne({ claimCode: 'ABCD2345' }, { $set: { status: 'expired' } });
    await expect(redeemClaimCode({ claimCode: 'ABCD2345', account: merchantAccount(campaign) })).rejects.toThrow(/expired/);
  });

  it('rejects a store that is not part of the campaign', async () => {
    const { campaign } = await seedWinner();
    await expect(
      redeemClaimCode({ claimCode: 'ABCD2345', account: merchantAccount(campaign), storeId: newId() }),
    ).rejects.toThrow(/not valid at that store/);
    expect((await LuckyDrawWinner.findOne({ claimCode: 'ABCD2345' })).status).toBe('notified');
  });

  it('redeems only once when two staff scan at the same moment', async () => {
    const { campaign } = await seedWinner();
    const account = merchantAccount(campaign);

    const results = await Promise.allSettled([
      redeemClaimCode({ claimCode: 'ABCD2345', account }),
      redeemClaimCode({ claimCode: 'ABCD2345', account }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected').reason).toBeInstanceOf(ConflictError);
  });
});

describe('expireStaleWinners', () => {
  it('expires only unredeemed winners whose window has passed', async () => {
    const past = new Date(Date.now() - 1000);
    await seedWinner({ claimCode: 'OLDNOTIF', status: 'notified', expiresAt: past });
    await seedWinner({ claimCode: 'OLDPENDN', status: 'pending', expiresAt: past });
    await seedWinner({ claimCode: 'OLDDONE2', status: 'redeemed', expiresAt: past });
    await seedWinner({ claimCode: 'STILLOK2', status: 'notified' });

    expect(await expireStaleWinners()).toBe(2);

    const byCode = Object.fromEntries((await LuckyDrawWinner.find()).map((w) => [w.claimCode, w.status]));
    expect(byCode).toEqual({ OLDNOTIF: 'expired', OLDPENDN: 'expired', OLDDONE2: 'redeemed', STILLOK2: 'notified' });
  });
});
