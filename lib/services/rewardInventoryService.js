import mongoose from "mongoose";
import Range from "@/models/rangeModel";
import { ValidationError, ConflictError } from "@/lib/errors";

/**
 * Reward (coupon) activation + optional stock — the single source of truth
 * for the rules, shared by the range editor API, reward issuance
 * (/api/customer/participate) and redemption (RedemptionService).
 *
 * Rewards live in `range.rewards` (see models/rangeModel.js for the shape).
 * Stock is therefore CAMPAIGN-WIDE per range, shared by every store the
 * campaign is assigned to — there is no per-store reward stock in the data
 * model, and this does not invent one.
 *
 * Stock only ever moves on a SUCCESSFUL REDEMPTION. Scanning, choosing a
 * range, scratching, revealing or abandoning the page never touch it — so
 * two customers can hold the same last unit; the first to redeem gets it
 * and the second is told it's gone (no reservation, by design).
 */

export const REWARD_TYPES = ["flat", "percentage", "gift"];
// Upper bound for a merchant-entered stock figure — far above any real
// shop's stock, low enough that arithmetic stays exact.
export const MAX_REWARD_QUANTITY = 1_000_000;

export const MESSAGES = {
  NO_REWARDS: "No rewards are currently available for this billing range.",
  OUT_OF_STOCK: "This reward is no longer available.",
  REPLENISH_FIRST: "Please increase the available quantity before activating this coupon.",
  BELOW_REDEEMED: "Quantity cannot be lower than the number of already redeemed rewards.",
  INVALID_QUANTITY: `Enter a whole number between 1 and ${MAX_REWARD_QUANTITY.toLocaleString("en-IN")}.`,
};

// ── Eligibility ──────────────────────────────────────────────────────────

/** Records saved before this feature have no isActive → active. */
export function isRewardActive(reward) {
  return reward?.isActive !== false;
}

/** Records saved before this feature have no quantityEnabled → unlimited. */
export function isQuantityLimited(reward) {
  return reward?.quantityEnabled === true;
}

/** Can this reward be issued as a NEW reward right now? */
export function isRewardEligible(reward) {
  if (!reward || !isRewardActive(reward)) return false;
  if (!isQuantityLimited(reward)) return true;
  return Number(reward.remainingQuantity) > 0;
}

/**
 * Random pick from the ELIGIBLE rewards only — same uniform random choice
 * the issuance code always used, just over a filtered pool.
 * @returns the reward, or null when nothing is eligible.
 */
export function pickEligibleReward(rewards, random = Math.random) {
  const pool = (Array.isArray(rewards) ? rewards : []).filter(isRewardEligible);
  if (pool.length === 0) return null;
  return pool[Math.floor(random() * pool.length)];
}

/**
 * How many scratch cards a customer sees for a range: the campaign's
 * configured "number of display coupons", or the number of saved rewards
 * if that is larger (never hide a configured reward). Deliberately NOT the
 * number of eligible rewards — inactive / out-of-stock rewards must not
 * shrink the grid. Cards are anonymous choices; the reward behind them is
 * decided server-side at issuance.
 */
export function configuredCardCount(campaign, range) {
  const configured = Number(campaign?.displayCoupons);
  const saved = Array.isArray(range?.rewards) ? range.rewards.length : 0;
  return Math.max(Number.isInteger(configured) && configured > 0 ? configured : 0, saved);
}

// ── Saving (merchant edits) ──────────────────────────────────────────────

/**
 * Strict positive-integer parse for a stock figure. Rejects negatives,
 * decimals, non-numeric strings, null/empty, and anything above the cap.
 */
export function parseQuantity(raw, label = "Quantity") {
  let n = null;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) n = Number(raw.trim());
  if (n === null || !Number.isInteger(n) || n < 1 || n > MAX_REWARD_QUANTITY) {
    throw new ValidationError(`${label}: ${MESSAGES.INVALID_QUANTITY}`);
  }
  return n;
}

/** Like parseQuantity, but 0 is allowed — "none left" is a valid stock figure. */
function parseAvailable(raw, label) {
  let n = null;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) n = Number(raw.trim());
  if (n === null || !Number.isInteger(n) || n < 0 || n > MAX_REWARD_QUANTITY) {
    throw new ValidationError(`${label}: ${MESSAGES.INVALID_QUANTITY}`);
  }
  return n;
}

/**
 * Merge the rewards a merchant submitted with what's stored.
 *
 * - Rewards are matched to stored ones by `rewardId`; an id that doesn't
 *   belong to THIS range (tampered, or copied from another range) is
 *   ignored and the reward gets a fresh id — so an edit can never touch
 *   another range's stock, and never duplicates a reward.
 * - `redeemedQuantity` is server-owned: always carried over from the
 *   stored reward, never read from the request. `remainingQuantity` is
 *   always recomputed as total − redeemed. A client cannot set either.
 * - The editable figure is either the AVAILABLE quantity
 *   (`availableQuantity` — what the coupon editor sends: "this many left")
 *   or the TOTAL allocation (`totalQuantity`). Available is applied against
 *   the redeemed count read here, at save time, so a scratch that lands
 *   while the merchant is editing can't skew it; total = available +
 *   redeemed. A total may go up or down, but not below what has already
 *   been redeemed.
 * - Turning quantity off keeps `redeemedQuantity` (history is never
 *   erased); turning it back on continues from that count, so nothing is
 *   double-counted. Redemptions made while unlimited were never counted
 *   against stock in the first place.
 * - A limited reward with nothing left cannot be saved as active. Raising
 *   the stock does NOT re-activate it — the merchant's isActive is kept.
 *
 * @param {Array} incoming rewards from the request
 * @param {Array} existing rewards currently stored on the range ([] on create)
 * @returns {Array} normalised rewards to store
 * @throws {ValidationError}
 */
export function normalizeRewardsForSave(incoming, existing = []) {
  if (!Array.isArray(incoming)) {
    throw new ValidationError("rewards must be an array");
  }

  const stored = new Map(
    (Array.isArray(existing) ? existing : [])
      .filter((r) => r && r.rewardId)
      .map((r) => [String(r.rewardId), r]),
  );
  const claimed = new Set();

  return incoming.map((raw, index) => {
    const label = `Coupon ${index + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new ValidationError(`${label}: invalid reward`);
    }

    const requestedId = raw.rewardId != null ? String(raw.rewardId) : null;
    const prev =
      requestedId && stored.has(requestedId) && !claimed.has(requestedId)
        ? stored.get(requestedId)
        : null;
    const rewardId = prev ? requestedId : new mongoose.Types.ObjectId().toString();
    claimed.add(rewardId);

    // Keep the reward's own configuration (type, value, description and any
    // legacy fields), but never take server-owned counters from the client.
    const {
      rewardId: _id,
      remainingQuantity: _rem,
      redeemedQuantity: _red,
      availableQuantity: _avail,
      ...config
    } = raw;

    const isActive = raw.isActive !== false;
    const quantityEnabled = raw.quantityEnabled === true;
    const redeemedQuantity = Math.max(0, Number(prev?.redeemedQuantity) || 0);

    let totalQuantity = null;
    let remainingQuantity = null;
    if (quantityEnabled && raw.availableQuantity !== undefined && raw.availableQuantity !== null) {
      remainingQuantity = parseAvailable(raw.availableQuantity, label);
      totalQuantity = remainingQuantity + redeemedQuantity;
      if (totalQuantity < 1 || totalQuantity > MAX_REWARD_QUANTITY) {
        throw new ValidationError(`${label}: ${MESSAGES.INVALID_QUANTITY}`);
      }
      if (isActive && remainingQuantity === 0) {
        throw new ValidationError(`${label}: ${MESSAGES.REPLENISH_FIRST}`);
      }
    } else if (quantityEnabled) {
      totalQuantity = parseQuantity(raw.totalQuantity, label);
      if (totalQuantity < redeemedQuantity) {
        throw new ValidationError(`${label}: ${MESSAGES.BELOW_REDEEMED}`);
      }
      remainingQuantity = totalQuantity - redeemedQuantity;
      if (isActive && remainingQuantity === 0) {
        throw new ValidationError(`${label}: ${MESSAGES.REPLENISH_FIRST}`);
      }
    }

    return {
      ...config,
      rewardId,
      isActive,
      quantityEnabled,
      totalQuantity,
      remainingQuantity,
      redeemedQuantity,
    };
  });
}

// ── Atomic stock operations (redemption) ─────────────────────────────────

/**
 * Take one unit of a reward's stock, atomically.
 *
 * The decrement is a single conditional update — `remainingQuantity > 0` is
 * part of the filter — so two concurrent redemptions of the last unit can't
 * both succeed and stock can never go negative. When it reaches zero the
 * reward is switched inactive in a follow-up update (also conditional, so
 * it only fires for a reward that really is at zero).
 *
 * @returns {{ tracked: false }} for an unlimited / legacy reward (nothing
 *   to deduct), or {{ tracked: true, deactivated }} after a deduction.
 * @throws {ConflictError} code OUT_OF_STOCK when the reward is limited and
 *   has nothing left.
 */
export async function takeRewardStock({ rangeId, rewardId, session = null }) {
  if (!rangeId || !rewardId) return { tracked: false };

  const taken = await Range.updateOne(
    {
      _id: rangeId,
      rewards: {
        $elemMatch: { rewardId: String(rewardId), quantityEnabled: true, remainingQuantity: { $gt: 0 } },
      },
    },
    {
      $inc: {
        "rewards.$.remainingQuantity": -1,
        "rewards.$.redeemedQuantity": 1,
        rewardsVersion: 1,
      },
    },
    { session },
  );

  if (taken.modifiedCount === 1) {
    const off = await Range.updateOne(
      {
        _id: rangeId,
        rewards: {
          $elemMatch: {
            rewardId: String(rewardId),
            quantityEnabled: true,
            remainingQuantity: { $lte: 0 },
            isActive: { $ne: false },
          },
        },
      },
      { $set: { "rewards.$.isActive": false }, $inc: { rewardsVersion: 1 } },
      { session },
    );
    return { tracked: true, deactivated: off.modifiedCount === 1 };
  }

  // Nothing deducted: either the reward is unlimited (fine), or it is
  // limited and empty (reject).
  const limited = await Range.exists({
    _id: rangeId,
    rewards: { $elemMatch: { rewardId: String(rewardId), quantityEnabled: true } },
  }).session(session);

  if (limited) {
    const err = new ConflictError(MESSAGES.OUT_OF_STOCK);
    err.code = "OUT_OF_STOCK";
    throw err;
  }
  return { tracked: false };
}

/**
 * Undo takeRewardStock — only used on the no-transaction fallback path
 * when a later step of the same redemption fails.
 */
export async function returnRewardStock({ rangeId, rewardId, reactivate = false }) {
  await Range.updateOne(
    {
      _id: rangeId,
      rewards: { $elemMatch: { rewardId: String(rewardId), quantityEnabled: true } },
    },
    {
      $inc: {
        "rewards.$.remainingQuantity": 1,
        "rewards.$.redeemedQuantity": -1,
        rewardsVersion: 1,
      },
      ...(reactivate ? { $set: { "rewards.$.isActive": true } } : {}),
    },
  );
}

// ── All-or-nothing execution ─────────────────────────────────────────────

function isTransactionUnsupported(err) {
  return (
    err?.code === 20 ||
    err?.codeName === "IllegalOperation" ||
    /Transaction numbers are only allowed|replica set/i.test(err?.message || "")
  );
}

/**
 * Run `work` all-or-nothing.
 *
 * On a replica set (MongoDB Atlas — production) it runs inside a real
 * transaction: any error rolls every write back.
 *
 * A standalone MongoDB (some local setups, the in-memory test server) has
 * no transactions; MongoDB rejects the very first operation, before
 * anything is written, so `work` is re-run without a session. Each step is
 * still individually atomic, and each one registers an undo via
 * `onRollback`; if a later step fails, the completed steps are undone in
 * reverse order.
 *
 * @param {(ctx: { session: ClientSession|null, onRollback: (fn) => void }) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function runAllOrNothing(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work({ session, onRollback: () => {} });
    });
    return result;
  } catch (err) {
    if (!isTransactionUnsupported(err)) throw err;
  } finally {
    await session.endSession();
  }

  const undo = [];
  try {
    return await work({ session: null, onRollback: (fn) => undo.push(fn) });
  } catch (err) {
    for (const fn of undo.reverse()) {
      try {
        await fn();
      } catch (undoErr) {
        console.error("[runAllOrNothing] rollback step failed:", undoErr);
      }
    }
    throw err;
  }
}
