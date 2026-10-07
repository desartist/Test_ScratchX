// Shared Lucky Draw constants. No imports: this file is also loaded by the
// Mongoose model files, which run under plain Node in scripts/sync-indexes.mjs.

export const DATE_CHANGE_NOTICE =
  'The draw date is set by the store owner and can change. The store owner is the only one who can change it. You will always see the latest date here.';

export const CLAIM_EXPIRY_DAYS = 30;
export const ALLOWED_RADIUS_METERS = 2000;
export const IST_OFFSET_MINUTES = 330;
export const DUPLICATE_WINDOW_MS = 60 * 1000;
export const CONFIRMATION_SMS_WINDOW_MS = 10 * 60 * 1000;

export const TRIGGER_MODES = ['automatic', 'manual'];
export const SCHEDULE_TYPES = ['end_of_campaign', 'recurring'];
export const RECURRENCE_FREQUENCIES = ['daily', 'weekly'];
export const PRIZE_MODES = ['shared', 'pool_per_tier', 'restricted'];
// online: customers enter by QR with their bill (the original flow).
// manual_online_reveal: numbered slips at the counter; ScratchX picks the winning slips and the owner reveals them live online.
// manual_offline_reveal: numbered slips at the counter; the owner draws them in the store and types in the winners.
export const DISTRIBUTION_MODES = ['online', 'manual_online_reveal', 'manual_offline_reveal'];
export const MANUAL_MODES = ['manual_online_reveal', 'manual_offline_reveal'];
export const isManualMode = (mode) => MANUAL_MODES.includes(mode);
export const MAX_PRIZE_CATEGORIES = 20;
export const MAX_TOTAL_WINNERS = 1000;
export const MAX_PRIZE_IMAGE_BYTES = 200 * 1024;
export const MAX_SLIP_COUNT = 1000000;
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'ended'];
export const DRAW_STATUSES = ['scheduled', 'running', 'completed', 'cancelled'];
export const WINNER_STATUSES = ['pending', 'notified', 'redeemed', 'expired'];
