/**
 * What counts as a "redeemed" coupon, for panels and counts.
 *
 * With no cashier system (CASHIER_REDEMPTION_ENABLED = false), a coupon is
 * done the moment the customer scratches it, so participations in
 * "revealed" status are shown, counted and filtered as "redeemed". The data
 * itself is unchanged — the customer screens still see "revealed" — so
 * turning the cashier flow back on needs no migration.
 *
 * No server-only imports: safe in client components and API routes alike.
 */
import { CASHIER_REDEMPTION_ENABLED } from "@/lib/featureFlags";

/** Reward stock is taken when the customer scratches, not at the counter. */
export const STOCK_TAKEN_AT_REVEAL = !CASHIER_REDEMPTION_ENABLED;

/** Participation statuses that count as a redeemed reward. */
export const REDEEMED_STATUSES = CASHIER_REDEMPTION_ENABLED
  ? ["redeemed"]
  : ["revealed", "redeemed"];

/** Mongo condition for "redeemed" — use as `{ status: REDEEMED_MATCH }`. */
export const REDEEMED_MATCH = { $in: REDEEMED_STATUSES };

/**
 * Aggregation expression for when a participation was redeemed — its reveal
 * time while the cashier is off. Pair with a `status: REDEEMED_MATCH` match.
 */
export const REDEEMED_AT_EXPR = CASHIER_REDEMPTION_ENABLED
  ? "$redeemed_at"
  : { $ifNull: ["$redeemed_at", "$revealed_at"] };

export function isRedeemedStatus(status) {
  return REDEEMED_STATUSES.includes(status);
}

/** The status a panel shows for a participation. */
export function displayStatus(status) {
  if (!CASHIER_REDEMPTION_ENABLED && status === "revealed") return "redeemed";
  return status;
}

/** When the reward counts as redeemed (reveal time while the cashier is off). */
export function redeemedAtOf(record) {
  if (!record) return null;
  if (record.redeemed_at) return record.redeemed_at;
  if (!CASHIER_REDEMPTION_ENABLED && record.status === "revealed") {
    return record.revealed_at || null;
  }
  return null;
}

/**
 * The Mongo `status` condition for a panel's status filter. Picking
 * "redeemed" (or the hidden "revealed") matches both while the cashier is
 * off, so the filter and the counts agree.
 */
export function statusFilter(status) {
  if (!CASHIER_REDEMPTION_ENABLED && (status === "redeemed" || status === "revealed")) {
    return REDEEMED_MATCH;
  }
  return status;
}

/** Status tabs/options for panels — "revealed" is folded into "redeemed". */
export function visibleStatuses(statuses) {
  if (CASHIER_REDEMPTION_ENABLED) return statuses;
  return statuses.filter((s) => (typeof s === "string" ? s : s.value) !== "revealed");
}

/** Maps every participation's `status` for a panel response. */
export function withDisplayStatus(rows) {
  return rows.map((r) => ({ ...r, status: displayStatus(r.status), redeemed_at: redeemedAtOf(r) }));
}
