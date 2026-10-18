/**
 * While there's no cashier (CASHIER_REDEMPTION_ENABLED = false), a scratched
 * ("revealed") coupon is shown, counted and filtered as redeemed.
 */
const {
  REDEEMED_STATUSES,
  REDEEMED_MATCH,
  STOCK_TAKEN_AT_REVEAL,
  displayStatus,
  isRedeemedStatus,
  redeemedAtOf,
  statusFilter,
  visibleStatuses,
  withDisplayStatus,
} = require('@/lib/redemptionStatus');

test('revealed counts as redeemed', () => {
  expect(STOCK_TAKEN_AT_REVEAL).toBe(true);
  expect(REDEEMED_STATUSES).toEqual(['revealed', 'redeemed']);
  expect(REDEEMED_MATCH).toEqual({ $in: ['revealed', 'redeemed'] });
  expect(isRedeemedStatus('revealed')).toBe(true);
  expect(isRedeemedStatus('verified')).toBe(false);
});

test('panels show revealed as redeemed; other statuses unchanged', () => {
  expect(displayStatus('revealed')).toBe('redeemed');
  expect(displayStatus('redeemed')).toBe('redeemed');
  expect(displayStatus('verified')).toBe('verified');
  expect(displayStatus('expired')).toBe('expired');
});

test('the redeemed date of a scratched coupon is its reveal time', () => {
  const at = new Date('2026-10-18T10:00:00Z');
  expect(redeemedAtOf({ status: 'revealed', revealed_at: at, redeemed_at: null })).toBe(at);
  expect(redeemedAtOf({ status: 'verified', revealed_at: null, redeemed_at: null })).toBeNull();
  const counter = new Date('2026-10-18T11:00:00Z');
  expect(redeemedAtOf({ status: 'redeemed', revealed_at: at, redeemed_at: counter })).toBe(counter);
});

test('the "redeemed" filter matches scratched coupons too', () => {
  expect(statusFilter('redeemed')).toEqual(REDEEMED_MATCH);
  expect(statusFilter('revealed')).toEqual(REDEEMED_MATCH);
  expect(statusFilter('verified')).toBe('verified');
});

test('the Revealed tab is folded away, both tab shapes', () => {
  expect(visibleStatuses(['all', 'revealed', 'redeemed'])).toEqual(['all', 'redeemed']);
  expect(visibleStatuses([{ value: 'revealed' }, { value: 'redeemed' }])).toEqual([{ value: 'redeemed' }]);
});

test('withDisplayStatus maps rows without mutating them', () => {
  const at = new Date();
  const rows = [{ _id: 1, status: 'revealed', revealed_at: at, redeemed_at: null }];
  expect(withDisplayStatus(rows)).toEqual([{ _id: 1, status: 'redeemed', revealed_at: at, redeemed_at: at }]);
  expect(rows[0].status).toBe('revealed');
});
