/**
 * The same redemption guarantees on a REPLICA SET — production's setup
 * (MongoDB Atlas) — where runAllOrNothing uses a real transaction and
 * rollback is MongoDB's abort, not the undo steps.
 *
 * __tests__/setup.js connects to a standalone server first; this file swaps
 * the connection to an in-memory replica set for its own tests.
 */
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const RedemptionService = require('@/lib/redemptionService').default;
const Range = require('@/models/rangeModel').default;
const ScratchCardRecord = require('@/models/scratchCardRecordModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const Campaign = require('@/models/campaignModel').default;
const { runAllOrNothing } = require('@/lib/services/rewardInventoryService');

let replSet;

beforeAll(async () => {
  await mongoose.disconnect();
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  // Collections must exist before they're written inside a transaction.
  for (const M of [Range, ScratchCardRecord, CustomerParticipation, ScratchCardTransaction, Campaign]) {
    await M.createCollection().catch(() => {});
  }
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});

const oid = () => new mongoose.Types.ObjectId();
const MIN = 60 * 1000;

async function makeWorld(rewards) {
  const w = { merchantId: oid(), storeA: oid(), campaignId: oid(), rangeId: oid(), staffId: oid() };
  await Campaign.collection.insertOne({
    _id: w.campaignId, merchantId: w.merchantId, campaignName: 'C', status: 'active',
    startDate: new Date(Date.now() - 60 * MIN), endDate: new Date(Date.now() + 60 * MIN),
    allocated_scratch_cards: 100, used_scratch_cards: 5, redeemed_scratch_cards: 0, remaining_scratch_cards: 95,
    assignedStores: [{ storeId: w.storeA, storeName: 'A', status: 'active' }],
  });
  await mongoose.connection.collection('stores').insertOne({ _id: w.storeA, store_name: 'A' });
  await Range.collection.insertOne({ _id: w.rangeId, campaignId: w.campaignId, minAmount: 1, maxAmount: 9, rewards, rewardsVersion: 0 });
  return w;
}

async function issueCard(w, rewardId) {
  const pid = oid();
  const cid = oid();
  await CustomerParticipation.collection.insertOne({ _id: pid, campaign_id: w.campaignId, store_id: w.storeA, status: 'revealed' });
  await ScratchCardRecord.collection.insertOne({
    _id: cid, campaign_id: w.campaignId, merchant_id: w.merchantId, store_id: w.storeA, range_id: w.rangeId,
    reward_id: rewardId, customer_participation_id: pid, status: 'revealed',
    expires_at: new Date(Date.now() + 5 * MIN), redeemed_at: null,
  });
  return { cid, pid };
}

const redeem = (w, cid) => RedemptionService.redeemScratchCard(w.merchantId, null, w.storeA, String(cid), w.staffId);
const reward = async (w, id) => (await Range.collection.findOne({ _id: w.rangeId })).rewards.find((r) => r.rewardId === id);
const limited = (rewardId, n) => ({ rewardId, isActive: true, quantityEnabled: true, totalQuantity: n, remainingQuantity: n, redeemedQuantity: 0 });

test('this file really runs on transactions', async () => {
  let sawSession = null;
  await runAllOrNothing(async ({ session }) => {
    sawSession = session;
  });
  expect(sawSession).not.toBeNull();
});

test('Case 10 — last unit, two redemptions at once: exactly one wins', async () => {
  const w = await makeWorld([limited('last', 1)]);
  const a = await issueCard(w, 'last');
  const b = await issueCard(w, 'last');
  const results = await Promise.allSettled([redeem(w, a.cid), redeem(w, b.cid)]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.find((r) => r.status === 'rejected').reason).toMatchObject({ code: 'OUT_OF_STOCK' });
  expect(await reward(w, 'last')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 1, isActive: false });
  expect(await ScratchCardRecord.countDocuments({ status: 'redeemed' })).toBe(1);
});

test('Case 24 — failure after the stock was taken: the transaction aborts, nothing persists', async () => {
  const w = await makeWorld([limited('g1', 1)]);
  const { cid, pid } = await issueCard(w, 'g1');
  const spy = jest.spyOn(ScratchCardTransaction, 'create').mockRejectedValueOnce(new Error('ledger down'));
  await expect(redeem(w, cid)).rejects.toThrow('ledger down');
  spy.mockRestore();

  expect(await reward(w, 'g1')).toMatchObject({ remainingQuantity: 1, redeemedQuantity: 0, isActive: true });
  expect((await ScratchCardRecord.collection.findOne({ _id: cid })).status).toBe('revealed');
  expect((await CustomerParticipation.collection.findOne({ _id: pid })).status).toBe('revealed');
  expect(await ScratchCardTransaction.countDocuments()).toBe(0);
});

test('double-tap on one card: stock taken once', async () => {
  const w = await makeWorld([limited('g5', 5)]);
  const { cid } = await issueCard(w, 'g5');
  const results = await Promise.allSettled([redeem(w, cid), redeem(w, cid), redeem(w, cid)]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 4, redeemedQuantity: 1 });
});

test('stress — 15 concurrent against 4 units', async () => {
  const w = await makeWorld([limited('g4', 4)]);
  const cards = await Promise.all(Array.from({ length: 15 }, () => issueCard(w, 'g4')));
  const results = await Promise.allSettled(cards.map((c) => redeem(w, c.cid)));
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(4);
  expect(await reward(w, 'g4')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 4 });
});
