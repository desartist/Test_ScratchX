import CustomerParticipation from "@/models/customerParticipationModel";

/**
 * Participation cooldown rules for the customer QR scan flow.
 *
 * Shared by /api/customer/check-participation (the gate the scan page calls
 * first) and /api/customer/participate (the server-side backstop), so the two
 * can't drift apart — they used to each carry their own copy of the constants.
 *
 * The cooldown is triggered by REVEALING a coupon, not by submitting the form.
 * Submitting creates a "verified" participation, but a customer who fills the
 * form, goes back, and fills it again hasn't won anything yet — blocking them
 * then is wrong. Only once a coupon is scratched and revealed (revealed_at is
 * set by /api/customer/participate/[id]/reveal) does the clock start.
 *
 * After reveal the customer has a 5-minute claim window to show the cashier
 * (reward_claim_expires_at), and the cooldown is 10 minutes on top of that.
 */
const CLAIM_WINDOW_MINUTES = 5;
const POST_CLAIM_COOLDOWN_MINUTES = 10;
export const COOLDOWN_AFTER_REVEAL_MINUTES =
  CLAIM_WINDOW_MINUTES + POST_CLAIM_COOLDOWN_MINUTES;

// An unrevealed participation can only be revealed within 5 minutes of being
// created — /api/customer/participation/[id] returns 410 expired after that.
export const REVEAL_WINDOW_MS = 5 * 60 * 1000;

// Extra allowance for the reveal call itself. The window is checked when the
// scratch page loads, but reveal fires only after the customer finishes
// scratching — someone who opens the card at 4:50 and scratches for 20 s
// shouldn't have their win pulled out from under them.
export const REVEAL_GRACE_MS = 60 * 1000;

/**
 * Whether an unrevealed participation is still inside its reveal window.
 * Only meaningful for status "verified"; callers handle other statuses.
 *
 * @param {{ createdAt: Date|string }} participation
 * @param {{ graceMs?: number, now?: number }} [opts]
 */
export function isWithinRevealWindow(participation, { graceMs = 0, now = Date.now() } = {}) {
  const created = new Date(participation.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created <= REVEAL_WINDOW_MS + graceMs;
}

// Status is kept alongside revealed_at so a record that reached "redeemed"
// without revealed_at being written still counts.
const REVEALED = {
  $or: [
    { revealed_at: { $ne: null } },
    { status: { $in: ["revealed", "redeemed"] } },
  ],
};

/**
 * The customer's most recent revealed coupon for this campaign, or null.
 * Covered by the { customer_mobile, campaign_id } index.
 */
export async function findLastRevealed(campaignId, customerMobile) {
  return CustomerParticipation.findOne({
    campaign_id: campaignId,
    customer_mobile: customerMobile,
    ...REVEALED,
  })
    .sort({ revealed_at: -1, createdAt: -1 })
    .lean();
}

/**
 * Whether this customer is currently in cooldown for this campaign.
 *
 * @returns {{ inCooldown: false }} or
 *   {{ inCooldown: true, remainingMinutes, revealedAt, participation }}
 */
export async function getCooldown(campaignId, customerMobile) {
  const last = await findLastRevealed(campaignId, customerMobile);
  if (!last) return { inCooldown: false, last: null };

  const revealedAt = new Date(last.revealed_at || last.updatedAt || last.createdAt);
  const minutesSince = (Date.now() - revealedAt.getTime()) / 60000;

  if (minutesSince >= COOLDOWN_AFTER_REVEAL_MINUTES) {
    return { inCooldown: false, last };
  }

  return {
    inCooldown: true,
    last,
    revealedAt,
    remainingMinutes: Math.ceil(COOLDOWN_AFTER_REVEAL_MINUTES - minutesSince),
  };
}

/**
 * An unrevealed participation this customer can still pick up where they
 * left off (they submitted, went back, and submitted again), or null.
 */
export async function findResumableParticipation(campaignId, customerMobile) {
  return CustomerParticipation.findOne({
    campaign_id: campaignId,
    customer_mobile: customerMobile,
    status: "verified",
    revealed_at: null,
    createdAt: { $gt: new Date(Date.now() - REVEAL_WINDOW_MS) },
  }).sort({ createdAt: -1 });
}
