/**
 * Participation cooldown rules (lib/participationCooldown.js).
 *
 * Regression: the cooldown used to start the moment the scan form was
 * submitted, so a customer who submitted, went back, and submitted again was
 * shown "Try Again Later" without ever having scratched a coupon. It must only
 * start once a coupon is revealed.
 */
const mongoose = require('mongoose');
const {
  getCooldown,
  findResumableParticipation,
  isWithinRevealWindow,
  COOLDOWN_AFTER_REVEAL_MINUTES,
  REVEAL_WINDOW_MS,
  REVEAL_GRACE_MS,
} = require('@/lib/participationCooldown');
const CustomerParticipation = require('@/models/customerParticipationModel').default;

const MIN = 60 * 1000;
const campaignId = new mongoose.Types.ObjectId().toString(); // routes pass a string
const mobile = '9876543210';

// Raw insert so createdAt/revealed_at can be backdated (timestamps: true
// would otherwise stamp "now").
function insert(overrides = {}) {
  const now = Date.now();
  return CustomerParticipation.collection.insertOne({
    campaign_id: new mongoose.Types.ObjectId(campaignId),
    customer_mobile: mobile,
    customer_name: 'Test Customer',
    range_id: new mongoose.Types.ObjectId(),
    scratch_card_id: new mongoose.Types.ObjectId(),
    status: 'verified',
    revealed_at: null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
    ...overrides,
  });
}

describe('getCooldown', () => {
  test('first-time customer is not in cooldown', async () => {
    const result = await getCooldown(campaignId, mobile);
    expect(result.inCooldown).toBe(false);
    expect(result.last).toBeNull();
  });

  test('submitted but never revealed → NOT in cooldown (the reported bug)', async () => {
    await insert({ status: 'verified', createdAt: new Date(Date.now() - 1 * MIN) });
    const result = await getCooldown(campaignId, mobile);
    expect(result.inCooldown).toBe(false);
  });

  test('revealed 2 min ago → in cooldown, measured from the reveal', async () => {
    const revealedAt = new Date(Date.now() - 2 * MIN);
    await insert({
      status: 'revealed',
      createdAt: new Date(Date.now() - 4 * MIN), // submitted earlier than reveal
      revealed_at: revealedAt,
    });
    const result = await getCooldown(campaignId, mobile);
    expect(result.inCooldown).toBe(true);
    expect(result.remainingMinutes).toBe(COOLDOWN_AFTER_REVEAL_MINUTES - 2);
    expect(result.revealedAt.getTime()).toBe(revealedAt.getTime());
  });

  test('revealed longer ago than the cooldown → free to participate', async () => {
    await insert({
      status: 'revealed',
      revealed_at: new Date(Date.now() - (COOLDOWN_AFTER_REVEAL_MINUTES + 1) * MIN),
    });
    const result = await getCooldown(campaignId, mobile);
    expect(result.inCooldown).toBe(false);
    expect(result.last).not.toBeNull(); // still a repeat customer
  });

  test('redeemed record with no revealed_at still counts', async () => {
    await insert({ status: 'redeemed', revealed_at: null, updatedAt: new Date(Date.now() - 1 * MIN) });
    const result = await getCooldown(campaignId, mobile);
    expect(result.inCooldown).toBe(true);
  });

  test('an older unrevealed attempt does not mask a recent reveal', async () => {
    await insert({ status: 'revealed', revealed_at: new Date(Date.now() - 3 * MIN) });
    await insert({ status: 'verified', createdAt: new Date(Date.now() - 1 * MIN) });
    const result = await getCooldown(campaignId, mobile);
    expect(result.inCooldown).toBe(true);
  });

  test('another mobile number is unaffected', async () => {
    await insert({ status: 'revealed', revealed_at: new Date() });
    const result = await getCooldown(campaignId, '9123456789');
    expect(result.inCooldown).toBe(false);
  });
});

describe('findResumableParticipation', () => {
  test('recent unrevealed attempt is resumable', async () => {
    const { insertedId } = await insert({ createdAt: new Date(Date.now() - 1 * MIN) });
    const found = await findResumableParticipation(campaignId, mobile);
    expect(String(found?._id)).toBe(String(insertedId));
  });

  test('picks the newest of several unrevealed attempts', async () => {
    await insert({ createdAt: new Date(Date.now() - 3 * MIN) });
    const { insertedId } = await insert({ createdAt: new Date(Date.now() - 1 * MIN) });
    const found = await findResumableParticipation(campaignId, mobile);
    expect(String(found?._id)).toBe(String(insertedId));
  });

  test('attempt older than the 5-minute reveal window is not resumable', async () => {
    await insert({ createdAt: new Date(Date.now() - 6 * MIN) });
    expect(await findResumableParticipation(campaignId, mobile)).toBeNull();
  });

  test('revealed, redeemed and retired attempts are not resumable', async () => {
    await insert({ status: 'revealed', revealed_at: new Date() });
    await insert({ status: 'redeemed', revealed_at: new Date() });
    await insert({ status: 'expired' });
    expect(await findResumableParticipation(campaignId, mobile)).toBeNull();
  });

  test('resume window and reveal window agree', async () => {
    // Just inside the window: resumable AND revealable.
    await insert({ createdAt: new Date(Date.now() - (REVEAL_WINDOW_MS - 5000)) });
    const found = await findResumableParticipation(campaignId, mobile);
    expect(found).not.toBeNull();
    expect(isWithinRevealWindow(found)).toBe(true);
  });

  test('returns a document that can be saved (used to retire it)', async () => {
    await insert();
    const found = await findResumableParticipation(campaignId, mobile);
    expect(typeof found.save).toBe('function');
  });
});

describe('isWithinRevealWindow (stale-session guard)', () => {
  const now = Date.now();
  const at = (msAgo) => ({ createdAt: new Date(now - msAgo) });

  test('fresh session is open', () => {
    expect(isWithinRevealWindow(at(1 * MIN), { now })).toBe(true);
  });

  test('exactly at the window edge is still open', () => {
    expect(isWithinRevealWindow(at(REVEAL_WINDOW_MS), { now })).toBe(true);
  });

  test('past the window is stale (no grace — page-load check)', () => {
    expect(isWithinRevealWindow(at(REVEAL_WINDOW_MS + 1000), { now })).toBe(false);
  });

  test('grace keeps a mid-scratch reveal alive just past the window', () => {
    expect(isWithinRevealWindow(at(REVEAL_WINDOW_MS + 30 * 1000), { now, graceMs: REVEAL_GRACE_MS })).toBe(true);
  });

  test('grace does not rescue a tab left open well past the window', () => {
    expect(isWithinRevealWindow(at(REVEAL_WINDOW_MS + REVEAL_GRACE_MS + 1000), { now, graceMs: REVEAL_GRACE_MS })).toBe(false);
    expect(isWithinRevealWindow(at(60 * MIN), { now, graceMs: REVEAL_GRACE_MS })).toBe(false);
  });

  test('missing/invalid createdAt fails closed', () => {
    expect(isWithinRevealWindow({ createdAt: undefined }, { now })).toBe(false);
    expect(isWithinRevealWindow({ createdAt: 'not a date' }, { now })).toBe(false);
  });
});
