/**
 * Redemption with optional reward stock — RedemptionService.redeemScratchCard
 * against real models on the in-memory MongoDB.
 *
 * The test server is a STANDALONE MongoDB (no transactions), so these run
 * the fallback path of runAllOrNothing: correctness rests on the conditional
 * updates plus undo steps. The replica-set (transaction) path is covered in
 * rewardRedemption.replset.test.js.
 */
const mongoose = require('mongoose');
const RedemptionService = require('@/lib/redemptionService').default;
const Range = require('@/models/rangeModel').default;
const ScratchCardRecord = require('@/models/scratchCardRecordModel').default;
const CustomerParticipation = require('@/models/customerParticipationModel').default;
const ScratchCardTransaction = require('@/models/scratchCardTransactionModel').default;
const Campaign = require('@/models/campaignModel').default;
const CampaignStoreMapping = require('@/models/campaignStoreMappingModel').default;
const { ConflictError, ValidationError, AuthorizationError } = require('@/lib/errors');

const oid = () => new mongoose.Types.ObjectId();
const MIN = 60 * 1000;

/** A live campaign assigned to two stores, with one range of `rewards`. */
async function makeWorld(rewards) {
  const merchantId = oid();
  const storeA = oid();
  const storeB = oid();
  const campaignId = oid();
  const rangeId = oid();
  await Campaign.collection.insertOne({
    _id: campaignId,
    merchantId,
    campaignName: 'Big Plywood Festival',
    status: 'active',
    startDate: new Date(Date.now() - 24 * 60 * MIN),
    endDate: new Date(Date.now() + 24 * 60 * MIN),
    allocated_scratch_cards: 1000,
    used_scratch_cards: 10,
    redeemed_scratch_cards: 3,
    remaining_scratch_cards: 987,
    assignedStores: [
      { storeId: storeA, storeName: 'A', status: 'active' },
      { storeId: storeB, storeName: 'B', status: 'active' },
    ],
  });
  for (const s of [storeA, storeB]) {
    await mongoose.connection.collection('stores').insertOne({ _id: s, store_name: `Store ${s}` });
  }
  await Range.collection.insertOne({ _id: rangeId, campaignId, minAmount: 1, maxAmount: 499, rewards, rewardsVersion: 0 });
  return { merchantId, storeA, storeB, campaignId, rangeId, staffId: oid() };
}

/** An issued card (default: revealed, valid for 5 more minutes). */
async function issueCard(world, { rewardId = null, storeId = world.storeA, status = 'revealed', expiresAt } = {}) {
  const participationId = oid();
  const cardId = oid();
  await CustomerParticipation.collection.insertOne({
    _id: participationId,
    campaign_id: world.campaignId,
    store_id: storeId,
    range_id: world.rangeId,
    customer_mobile: '9876543210',
    status,
    scratch_card_id: cardId,
  });
  await ScratchCardRecord.collection.insertOne({
    _id: cardId,
    campaign_id: world.campaignId,
    merchant_id: world.merchantId,
    store_id: storeId,
    range_id: world.rangeId,
    reward_id: rewardId,
    customer_participation_id: participationId,
    reward_type: 'discount',
    reward_value: 50,
    status,
    expires_at: expiresAt || new Date(Date.now() + 5 * MIN),
    redeemed_at: null,
  });
  return { cardId, participationId };
}

const redeem = (world, cardId, storeId = world.storeA) =>
  RedemptionService.redeemScratchCard(world.merchantId, null, storeId, String(cardId), world.staffId, '');

const reward = async (world, rewardId) =>
  (await Range.collection.findOne({ _id: world.rangeId })).rewards.find((r) => r.rewardId === rewardId);
const cardStatus = async (cardId) => (await ScratchCardRecord.collection.findOne({ _id: cardId })).status;
const partStatus = async (id) => (await CustomerParticipation.collection.findOne({ _id: id })).status;

const limited = (rewardId, total, extra = {}) => ({
  rewardId, type: 'gift', value: 'img', isActive: true,
  quantityEnabled: true, totalQuantity: total, remainingQuantity: total, redeemedQuantity: 0, ...extra,
});
const unlimited = (rewardId, extra = {}) => ({
  rewardId, type: 'flat', value: 50, isActive: true,
  quantityEnabled: false, totalQuantity: null, remainingQuantity: null, redeemedQuantity: 0, ...extra,
});

describe('successful redemption', () => {
  test('Case 1 — unlimited: every redemption succeeds, nothing is counted against stock', async () => {
    const w = await makeWorld([unlimited('u1')]);
    for (let i = 0; i < 10; i++) {
      const { cardId } = await issueCard(w, { rewardId: 'u1' });
      const res = await redeem(w, cardId);
      expect(res.success).toBe(true);
      expect(res.stock.tracked).toBe(false);
    }
    expect(await reward(w, 'u1')).toMatchObject({ isActive: true, remainingQuantity: null, redeemedQuantity: 0 });
  });

  test('limited: one redemption takes exactly one unit', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    const { cardId, participationId } = await issueCard(w, { rewardId: 'g5' });
    await redeem(w, cardId);
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 4, redeemedQuantity: 1, totalQuantity: 5, isActive: true });
    expect(await cardStatus(cardId)).toBe('redeemed');
    expect(await partStatus(participationId)).toBe('redeemed');
    expect(await ScratchCardTransaction.countDocuments({ action_type: 'redeemed' })).toBe(1);
  });

  test('Case 2 / Feature 5 — reaching zero switches the reward inactive; the next one is refused', async () => {
    const w = await makeWorld([limited('g2', 2)]);
    const c1 = await issueCard(w, { rewardId: 'g2' });
    const c2 = await issueCard(w, { rewardId: 'g2' });
    const c3 = await issueCard(w, { rewardId: 'g2' });

    await redeem(w, c1.cardId);
    expect(await reward(w, 'g2')).toMatchObject({ remainingQuantity: 1, isActive: true });

    await redeem(w, c2.cardId);
    expect(await reward(w, 'g2')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 2, isActive: false });

    await expect(redeem(w, c3.cardId)).rejects.toMatchObject({ code: 'OUT_OF_STOCK', message: 'This reward is no longer available.' });
    expect(await reward(w, 'g2')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 2 });
    expect(await cardStatus(c3.cardId)).toBe('revealed'); // untouched
  });

  test('the store-mapping fix: a normally-assigned campaign (no mapping) redeems', async () => {
    const w = await makeWorld([unlimited('u1')]);
    expect(await CampaignStoreMapping.countDocuments()).toBe(0);
    const { cardId } = await issueCard(w, { rewardId: 'u1' });
    await expect(redeem(w, cardId)).resolves.toMatchObject({ success: true });
  });

  test('campaign counters are not double-counted (reveal already counted the card)', async () => {
    const w = await makeWorld([unlimited('u1')]);
    const before = await Campaign.collection.findOne({ _id: w.campaignId });
    const { cardId } = await issueCard(w, { rewardId: 'u1' });
    await redeem(w, cardId);
    const after = await Campaign.collection.findOne({ _id: w.campaignId });
    expect(after.redeemed_scratch_cards).toBe(before.redeemed_scratch_cards);
  });
});

describe('only redemption moves stock (Feature 3)', () => {
  test('issuing, revealing, viewing and abandoning cards never change stock', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    await issueCard(w, { rewardId: 'g5', status: 'verified' });   // received, not scratched
    await issueCard(w, { rewardId: 'g5', status: 'revealed' });   // scratched, not redeemed
    await issueCard(w, { rewardId: 'g5', status: 'expired' });    // closed the page
    await ScratchCardRecord.findOne({ reward_id: 'g5' });         // viewed
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 5, redeemedQuantity: 0 });
  });

  test('Case 8 — a failed redemption changes nothing', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    const { cardId } = await issueCard(w, { rewardId: 'g5', status: 'verified' }); // not revealed yet
    await expect(redeem(w, cardId)).rejects.toBeInstanceOf(ValidationError);
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 5, redeemedQuantity: 0 });
  });

  test('Case 11 — expired card is refused and stock is untouched', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    const { cardId } = await issueCard(w, { rewardId: 'g5', expiresAt: new Date(Date.now() - MIN) });
    await expect(redeem(w, cardId)).rejects.toThrow(/expired/);
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 5 });
    expect(await cardStatus(cardId)).toBe('revealed');
  });
});

describe('concurrency and duplicates', () => {
  test('Case 10 — two redemptions of the LAST unit at once: exactly one wins', async () => {
    const w = await makeWorld([limited('last', 1)]);
    const a = await issueCard(w, { rewardId: 'last' });
    const b = await issueCard(w, { rewardId: 'last' });

    const results = await Promise.allSettled([redeem(w, a.cardId), redeem(w, b.cardId)]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const refused = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0].reason).toMatchObject({ code: 'OUT_OF_STOCK' });

    expect(await reward(w, 'last')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 1, isActive: false });
    const statuses = [await cardStatus(a.cardId), await cardStatus(b.cardId)].sort();
    expect(statuses).toEqual(['redeemed', 'revealed']); // the loser was rolled back
  });

  test('stress — 20 concurrent redemptions against 5 units: exactly 5 succeed, never negative', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    const cards = await Promise.all(Array.from({ length: 20 }, () => issueCard(w, { rewardId: 'g5' })));
    const results = await Promise.allSettled(cards.map((c) => redeem(w, c.cardId)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 5 });
    expect(await ScratchCardRecord.countDocuments({ status: 'redeemed' })).toBe(5);
  });

  test('Case 9 / 20 — the same card redeemed twice (retry): one success, stock taken once', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    const { cardId } = await issueCard(w, { rewardId: 'g5' });
    await redeem(w, cardId);
    await expect(redeem(w, cardId)).rejects.toMatchObject({ code: 'ALREADY_REDEEMED' });
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 4, redeemedQuantity: 1 });
  });

  test('...and a double-tap at the same instant', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    const { cardId } = await issueCard(w, { rewardId: 'g5' });
    const results = await Promise.allSettled([redeem(w, cardId), redeem(w, cardId), redeem(w, cardId)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 4, redeemedQuantity: 1 });
    expect(await ScratchCardTransaction.countDocuments({ action_type: 'redeemed' })).toBe(1);
  });
});

describe('rollback (Case 24)', () => {
  test('ledger write fails after stock was taken → everything is restored', async () => {
    const w = await makeWorld([limited('g1', 1)]);
    const { cardId, participationId } = await issueCard(w, { rewardId: 'g1' });

    const spy = jest.spyOn(ScratchCardTransaction, 'create').mockRejectedValueOnce(new Error('ledger down'));
    await expect(redeem(w, cardId)).rejects.toThrow('ledger down');
    spy.mockRestore();

    // Taking the last unit had deactivated it — the undo restores that too.
    expect(await reward(w, 'g1')).toMatchObject({ remainingQuantity: 1, redeemedQuantity: 0, isActive: true });
    expect(await cardStatus(cardId)).toBe('revealed');
    expect(await partStatus(participationId)).toBe('revealed');

    // ...and the card can then be redeemed normally.
    await expect(redeem(w, cardId)).resolves.toMatchObject({ success: true });
    expect(await reward(w, 'g1')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 1 });
  });
});

describe('scope and tampering', () => {
  test('Case 25 — stock comes from the card record: another reward is never touched', async () => {
    const w = await makeWorld([limited('A', 1), limited('B', 5)]);
    const { cardId } = await issueCard(w, { rewardId: 'B' });
    await redeem(w, cardId);
    expect(await reward(w, 'A')).toMatchObject({ remainingQuantity: 1, redeemedQuantity: 0 });
    expect(await reward(w, 'B')).toMatchObject({ remainingQuantity: 4 });
  });

  test('a card from another store is refused, nothing changes', async () => {
    const w = await makeWorld([limited('g5', 5)]);
    const { cardId } = await issueCard(w, { rewardId: 'g5', storeId: w.storeA });
    await expect(redeem(w, cardId, w.storeB)).rejects.toBeInstanceOf(AuthorizationError);
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 5 });
  });

  test('Case 16 — stock is campaign-wide: both stores draw on the same units', async () => {
    const w = await makeWorld([limited('shared', 2)]);
    const a = await issueCard(w, { rewardId: 'shared', storeId: w.storeA });
    const b = await issueCard(w, { rewardId: 'shared', storeId: w.storeB });
    await redeem(w, a.cardId, w.storeA);
    await redeem(w, b.cardId, w.storeB);
    expect(await reward(w, 'shared')).toMatchObject({ remainingQuantity: 0, redeemedQuantity: 2 });
  });

  test('Case 17 — a coupon issued before manual deactivation stays redeemable', async () => {
    const w = await makeWorld([limited('g5', 5, { isActive: false })]);
    const { cardId } = await issueCard(w, { rewardId: 'g5' });
    await expect(redeem(w, cardId)).resolves.toMatchObject({ success: true });
    expect(await reward(w, 'g5')).toMatchObject({ remainingQuantity: 4, isActive: false });
  });

  test('Case 14 — legacy card with no reward_id redeems as unlimited', async () => {
    const w = await makeWorld([{ type: 'flat', value: 50 }]); // legacy reward, no fields at all
    const { cardId } = await issueCard(w, { rewardId: null });
    const res = await redeem(w, cardId);
    expect(res.stock.tracked).toBe(false);
  });

  test('invalid card id is rejected cleanly', async () => {
    const w = await makeWorld([]);
    await expect(
      RedemptionService.redeemScratchCard(w.merchantId, null, w.storeA, 'not-an-id', w.staffId),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('archived (deleted) campaign → refused', async () => {
    const w = await makeWorld([unlimited('u1')]);
    const { cardId } = await issueCard(w, { rewardId: 'u1' });
    await Campaign.collection.updateOne({ _id: w.campaignId }, { $set: { isDeleted: true, status: 'ended' } });
    await expect(redeem(w, cardId)).rejects.toThrow('Campaign not found');
  });
});

describe('reversal returns the stock', () => {
  test('reversing a redemption gives the unit back without re-activating', async () => {
    const w = await makeWorld([limited('g1', 1)]);
    const { cardId } = await issueCard(w, { rewardId: 'g1' });
    const res = await redeem(w, cardId);
    expect(await reward(w, 'g1')).toMatchObject({ remainingQuantity: 0, isActive: false });

    await RedemptionService.reverseRedemption(res.transaction._id, w.staffId, 'wrong card');

    expect(await reward(w, 'g1')).toMatchObject({ remainingQuantity: 1, redeemedQuantity: 0, isActive: false });
    expect(await cardStatus(cardId)).toBe('revealed');
    await expect(RedemptionService.reverseRedemption(res.transaction._id, w.staffId)).rejects.toBeInstanceOf(ValidationError);
  });
});

test('ConflictError is what callers map to HTTP 409', () => {
  expect(new ConflictError('x').statusCode).toBe(409);
});
