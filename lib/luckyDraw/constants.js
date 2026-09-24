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
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'ended'];
export const DRAW_STATUSES = ['scheduled', 'running', 'completed', 'cancelled'];
export const WINNER_STATUSES = ['pending', 'notified', 'redeemed', 'expired'];
