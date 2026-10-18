/**
 * Backfill: count coupons scratched BEFORE reveal-time stock against their
 * reward's quantity.
 *
 * Background: with no cashier system (CASHIER_REDEMPTION_ENABLED = false in
 * lib/featureFlags.js), a coupon counts as redeemed when the customer
 * scratches it, and the reveal route now takes one unit of a
 * quantity-limited reward at that moment. Coupons scratched before that
 * change never took stock — and many of their scratch-card records were left
 * in 'generated' status by the old reveal route (it only updated the
 * participation). This script brings those old coupons in line:
 *
 *   for every participation in 'revealed' status whose scratch card has not
 *   been counted yet (stock_stage unset), oldest scratch first:
 *     1. mark the card 'revealed' (with the participation's reveal time) and
 *        stock_stage 'reveal' — exactly what the reveal route does today;
 *     2. if its reward is quantity-limited, take one unit
 *        (remainingQuantity − 1, redeemedQuantity + 1), and switch the reward
 *        off when it reaches 0.
 *   Both steps happen together (a transaction on Atlas), so a card is never
 *   marked counted without its unit being taken, or the other way round.
 *
 * Skipped on purpose:
 *   • participations already 'redeemed' — a cashier redemption already took
 *     their stock;
 *   • cards with stock_stage already set — revealed after the change;
 *   • OVER-ISSUED cards: the reward's remaining stock is already 0 (more
 *     coupons were scratched than the quantity allowed, because stock used to
 *     move only at the counter). These are left untouched and listed so the
 *     merchant can decide — e.g. raise the quantity in the coupon editor and
 *     re-run this script.
 *
 * Campaign scratch counters are NOT touched: the reveal route has always
 * counted those.
 *
 * Safe to re-run: a counted card is never counted again (the claim only
 * matches cards whose stock_stage is unset).
 *
 * Usage (from the project root):
 *   node scripts/backfill-reveal-stock.mjs            (dry run — reports only)
 *   node scripts/backfill-reveal-stock.mjs --commit   (applies the fix)
 *
 * Reads MONGODB_URI (or DB_URL) from .env.local / .env. To run against
 * production, point MONGODB_URI at the prod connection string for this
 * invocation:
 *   MONGODB_URI="<prod-uri>" node scripts/backfill-reveal-stock.mjs --commit
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const COMMIT = process.argv.includes("--commit");
const URI = process.env.MONGODB_URI || process.env.DB_URL;

const UNSET = { $in: [null] }; // matches a missing field and an explicit null
const OPEN_CARD = ["generated", "revealed"];
const OVER_ISSUED = new Error("over-issued"); // sentinel: abort this card's transaction

function rewardLabel(r) {
  if (!r) return "(reward removed from range)";
  if (r.type === "gift") return `Gift${r.description ? ` — ${r.description}` : ""}`;
  if (r.type === "percentage") return `${r.value}% off`;
  return `₹${r.value} off`;
}

/** Whether the server is a replica set (Atlas) — transactions available. */
async function supportsTransactions(db) {
  const hello = await db.admin().command({ hello: 1 });
  return Boolean(hello.setName || hello.msg === "isdbgrid");
}

/**
 * Count one card. Returns 'counted' | 'counted-unlimited' | 'over-issued' |
 * 'already-done'.
 */
async function countCard({ cards, ranges }, card, revealedAt, session) {
  const claimed = await cards.updateOne(
    { _id: card._id, stock_stage: UNSET, status: { $in: OPEN_CARD } },
    { $set: { status: "revealed", revealed_at: revealedAt, stock_stage: "reveal" } },
    { session },
  );
  if (claimed.modifiedCount !== 1) return { outcome: "already-done" };

  if (!card.reward_id || !card.range_id) return { outcome: "counted-unlimited" };

  const rewardId = String(card.reward_id);
  const taken = await ranges.updateOne(
    {
      _id: card.range_id,
      rewards: { $elemMatch: { rewardId, quantityEnabled: true, remainingQuantity: { $gt: 0 } } },
    },
    { $inc: { "rewards.$.remainingQuantity": -1, "rewards.$.redeemedQuantity": 1, rewardsVersion: 1 } },
    { session },
  );

  if (taken.modifiedCount === 1) {
    await ranges.updateOne(
      {
        _id: card.range_id,
        rewards: {
          $elemMatch: { rewardId, quantityEnabled: true, remainingQuantity: { $lte: 0 }, isActive: { $ne: false } },
        },
      },
      { $set: { "rewards.$.isActive": false }, $inc: { rewardsVersion: 1 } },
      { session },
    );
    return { outcome: "counted" };
  }

  const limited = await ranges.countDocuments(
    { _id: card.range_id, rewards: { $elemMatch: { rewardId, quantityEnabled: true } } },
    { session },
  );
  if (limited) return { outcome: "over-issued", undo: true };
  return { outcome: "counted-unlimited" };
}

async function main() {
  if (!URI) {
    console.error("MONGODB_URI (or DB_URL) is not set — add it to .env.local or pass it inline.");
    process.exit(1);
  }
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const participations = db.collection("customerparticipations");
  const cards = db.collection("scratchcardrecords");
  const ranges = db.collection("ranges");

  console.log(`Database: ${db.databaseName}`);
  console.log(`Mode: ${COMMIT ? "COMMIT (writing changes)" : "DRY RUN (no changes will be made)"}\n`);

  // Oldest scratch first — if stock is short, the earliest winners get it.
  const revealed = await participations
    .find(
      { status: "revealed", scratch_card_id: { $ne: null } },
      { projection: { scratch_card_id: 1, revealed_at: 1, updatedAt: 1, customer_name: 1, campaign_id: 1 } },
    )
    .sort({ revealed_at: 1, createdAt: 1 })
    .toArray();

  const cardDocs = await cards
    .find({ _id: { $in: revealed.map((p) => p.scratch_card_id) }, stock_stage: UNSET, status: { $in: OPEN_CARD } })
    .toArray();
  const cardById = new Map(cardDocs.map((c) => [String(c._id), c]));
  const todo = revealed
    .filter((p) => cardById.has(String(p.scratch_card_id)))
    .map((p) => ({ participation: p, card: cardById.get(String(p.scratch_card_id)) }));

  console.log(`Revealed participations: ${revealed.length}`);
  console.log(`Not yet counted against stock: ${todo.length}\n`);
  if (todo.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  // ---- Plan: simulate per reward, oldest first --------------------------
  const rangeIds = [...new Set(todo.map((t) => String(t.card.range_id)).filter(Boolean))];
  const rangeDocs = await ranges
    .find({ _id: { $in: rangeIds.map((id) => new mongoose.Types.ObjectId(id)) } })
    .toArray();
  const rangeById = new Map(rangeDocs.map((r) => [String(r._id), r]));

  const plan = new Map(); // key → { label, range, reward, remaining, take, over }
  let unlimited = 0;
  for (const { card } of todo) {
    const range = rangeById.get(String(card.range_id));
    const reward = card.reward_id
      ? (range?.rewards || []).find((r) => String(r?.rewardId) === String(card.reward_id))
      : null;
    if (!reward || reward.quantityEnabled !== true) {
      unlimited += 1;
      continue;
    }
    const key = `${card.range_id}:${card.reward_id}`;
    if (!plan.has(key)) {
      plan.set(key, {
        range: range ? `₹${range.minAmount}–₹${range.maxAmount}` : String(card.range_id),
        reward: rewardLabel(reward),
        total: reward.totalQuantity,
        remainingNow: Number(reward.remainingQuantity) || 0,
        take: 0,
        over: 0,
      });
    }
    const row = plan.get(key);
    if (row.remainingNow - row.take > 0) row.take += 1;
    else row.over += 1;
  }

  console.log("Quantity-limited rewards affected:");
  if (plan.size === 0) console.log("  (none)");
  for (const row of plan.values()) {
    console.log(
      `  • Range ${row.range} | ${row.reward} | total ${row.total} | ` +
        `remaining ${row.remainingNow} → ${row.remainingNow - row.take} ` +
        `(${row.take} to count${row.over ? `, ${row.over} OVER-ISSUED — left untouched` : ""})`,
    );
  }
  console.log(`\nUnlimited / legacy rewards: ${unlimited} card(s) — status fixed only, no stock to take.\n`);

  if (!COMMIT) {
    console.log("Dry run complete. Re-run with --commit to apply.");
    return;
  }

  // ---- Apply ---------------------------------------------------------------
  const useTx = await supportsTransactions(db);
  console.log(`Writing ${useTx ? "with transactions" : "without transactions (standalone server)"}...\n`);

  const tally = { counted: 0, "counted-unlimited": 0, "over-issued": 0, "already-done": 0, failed: 0 };
  const overIssued = [];

  for (const { participation, card } of todo) {
    const revealedAt = card.revealed_at || participation.revealed_at || participation.updatedAt || new Date();
    try {
      let result;
      if (useTx) {
        const session = mongoose.connection.client.startSession();
        try {
          await session.withTransaction(async () => {
            result = await countCard({ cards, ranges }, card, revealedAt, session);
            // Throwing rolls back the card claim — the card stays as it was.
            if (result.undo) throw OVER_ISSUED;
          });
        } catch (err) {
          if (err !== OVER_ISSUED) throw err;
        } finally {
          await session.endSession();
        }
      } else {
        result = await countCard({ cards, ranges }, card, revealedAt, null);
        if (result.undo) {
          await cards.updateOne(
            { _id: card._id, stock_stage: "reveal" },
            { $set: { status: card.status, revealed_at: card.revealed_at ?? null, stock_stage: null } },
          );
        }
      }
      tally[result.outcome] += 1;
      if (result.outcome === "over-issued") {
        overIssued.push(`${participation.customer_name || "?"} — card ${card._id}`);
      }
    } catch (err) {
      tally.failed += 1;
      console.error(`  ✖ card ${card._id}: ${err.message}`);
    }
  }

  console.log("Done:");
  console.log(`  counted against stock:        ${tally.counted}`);
  console.log(`  unlimited (status fixed):     ${tally["counted-unlimited"]}`);
  console.log(`  already counted (skipped):    ${tally["already-done"]}`);
  console.log(`  over-issued (left untouched): ${tally["over-issued"]}`);
  console.log(`  failed:                       ${tally.failed}`);
  if (overIssued.length) {
    console.log("\nOver-issued coupons (stock was already 0):");
    for (const line of overIssued) console.log(`  • ${line}`);
    console.log("Raise the quantity in the coupon editor and re-run to count them.");
  }
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
