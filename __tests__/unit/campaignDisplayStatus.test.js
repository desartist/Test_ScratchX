/** lib/campaignDisplayStatus.js — the status every campaign screen shows. */
const { campaignDisplayStatus } = require('@/lib/campaignDisplayStatus');

const NOW = new Date('2026-10-19T12:00:00Z');
const at = (iso) => new Date(iso);

test('Test_campaign2: launched (active), starts tomorrow → scheduled, not draft', () => {
  expect(campaignDisplayStatus({ status: 'active', startDate: at('2026-10-20'), endDate: at('2026-10-29') }, NOW)).toBe('scheduled');
});

test('never launched → draft, whatever the dates', () => {
  expect(campaignDisplayStatus({ status: 'draft', startDate: at('2026-10-20'), endDate: at('2026-10-29') }, NOW)).toBe('draft');
  expect(campaignDisplayStatus({ status: 'draft', startDate: at('2026-01-01'), endDate: at('2026-02-01') }, NOW)).toBe('draft');
});

test('running / paused keep their stored status; past end date → ended', () => {
  expect(campaignDisplayStatus({ status: 'active', startDate: at('2026-10-01'), endDate: at('2026-10-29') }, NOW)).toBe('active');
  expect(campaignDisplayStatus({ status: 'paused', startDate: at('2026-10-01'), endDate: at('2026-10-29') }, NOW)).toBe('paused');
  expect(campaignDisplayStatus({ status: 'active', startDate: at('2026-09-01'), endDate: at('2026-10-01') }, NOW)).toBe('ended');
});
