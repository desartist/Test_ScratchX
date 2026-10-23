// Shared Lucky Draw constants. No imports: this file is also loaded by the
// Mongoose model files, which run under plain Node in scripts/sync-indexes.mjs.

export const DATE_CHANGE_NOTICE = 'The store may change the draw date. You will always see the latest date here.';

export const CLAIM_EXPIRY_DAYS = 30;
export const ALLOWED_RADIUS_METERS = 2000;
export const IST_OFFSET_MINUTES = 330;
export const DUPLICATE_WINDOW_MS = 60 * 1000;
export const CONFIRMATION_SMS_WINDOW_MS = 10 * 60 * 1000;

export const MAX_PRIZE_CATEGORIES = 20;
export const MAX_TOTAL_WINNERS = 1000;
export const MAX_PRIZE_IMAGE_BYTES = 200 * 1024;
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'ended'];
export const DRAW_STATUSES = ['scheduled', 'running', 'completed', 'cancelled'];
export const WINNER_STATUSES = ['pending', 'notified', 'redeemed', 'expired'];

// How a draw runs (chosen in step 1 of the create wizard, locked after publishing):
//  physical:    staff type each entry in at the counter; the draw is held in the shop and the owner picks the winners.
//  live_online: customers scan the QR or staff type entries in; ScratchX picks, the owner reveals the smallest prize first and the Grand last.
//  digital:     customers scan the QR only; the owner presses Run draw and ScratchX picks every winner at once.
export const DRAW_TYPES = ['physical', 'live_online', 'digital'];
export const STAFF_ENTRY_DRAW_TYPES = ['physical', 'live_online'];
export const QR_ENTRY_DRAW_TYPES = ['live_online', 'digital'];
export const ENTRY_SOURCES = ['qr', 'staff'];
// Anyone who works at the merchant's stores may type in an entry (the same roles that redeem prizes).
export const ENTRY_ROLES = ['Merchant', 'Manager', 'Store_Manager', 'Store_Staff'];
// Prize levels: rank 1 is the grand prize (always one winner); 2nd and 3rd are required and can have many winners;
// smaller prizes (4th, 5th, …) are optional, up to MAX_PRIZE_CATEGORIES levels in all.
export const PRIZE_RANKS = { GRAND: 1, SECOND: 2, THIRD: 3 };
export const REQUIRED_PRIZE_LEVELS = 3;
