import {
  drawStage,
  listGroup,
  nextStep,
  daysUntil,
  timelinePosition,
  formatDay,
  DRAW_TYPE_LABEL,
  PRIZE_LEVEL_LABEL,
  describeMinBill,
} from '@/lib/luckyDraw/display';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-20T06:30:00.000Z');
const campaign = (overrides = {}) => ({
  status: 'active',
  drawType: 'digital',
  startDate: '2026-10-05T00:00:00.000Z',
  endDate: '2026-10-31T18:29:00.000Z',
  revealDate: '2026-11-02T13:30:00.000Z',
  ...overrides,
});

describe('drawStage', () => {
  it('follows the draw through its dates', () => {
    expect(drawStage(campaign({ status: 'draft' }), { now }).key).toBe('draft');
    expect(drawStage(campaign({ startDate: '2026-10-25T00:00:00.000Z' }), { now }).key).toBe('scheduled');
    expect(drawStage(campaign(), { now }).label).toBe('Entries open');
    expect(drawStage(campaign(), { now: new Date('2026-11-01T00:00:00.000Z') }).key).toBe('closed');
    expect(drawStage(campaign(), { now: new Date('2026-11-02T14:00:00.000Z') }).key).toBe('due');
    expect(drawStage(campaign({ status: 'paused' }), { now }).key).toBe('paused');
    expect(drawStage(campaign({ status: 'ended' }), { now }).label).toBe('Completed');
    expect(drawStage(campaign({ status: 'ended', revealInProgress: true }), { now })).toMatchObject({ key: 'live', label: 'Revealing live' });
  });

  it('labels the due stage "Draw day" except for live online draws, which keep "Reveal day"', () => {
    const due = { now: new Date('2026-11-02T14:00:00.000Z') };
    expect(drawStage(campaign({ drawType: 'digital' }), due).label).toBe('Draw day');
    expect(drawStage(campaign({ drawType: 'physical' }), due).label).toBe('Draw day');
    expect(drawStage(campaign({ drawType: 'live_online' }), due).label).toBe('Reveal day');
  });

  it('uses the open draw date when it differs from the campaign', () => {
    const later = { drawDate: '2026-11-09T13:30:00.000Z' };
    expect(drawStage(campaign(), { now: new Date('2026-11-03T00:00:00.000Z'), openDraw: later }).key).toBe('closed');
  });
});

describe('listGroup and nextStep', () => {
  it('groups for the filter tabs', () => {
    expect(listGroup({ key: 'open' })).toBe('active');
    expect(listGroup({ key: 'due' })).toBe('active');
    expect(listGroup({ key: 'draft' })).toBe('scheduled');
    expect(listGroup({ key: 'completed' })).toBe('done');
  });

  it('says what happens next', () => {
    expect(nextStep(campaign(), { key: 'open' })).toMatch(/^Entries close 31 Oct/);
    expect(nextStep(campaign({ drawType: 'live_online' }), { key: 'due' })).toBe('Reveal winners live today');
    expect(nextStep(campaign({ drawType: 'physical' }), { key: 'due' })).toBe('Pick the winners today');
    expect(nextStep(campaign({ drawType: 'digital' }), { key: 'due' })).toBe('Draw winners today');
    expect(nextStep(campaign({ drawType: 'live_online' }), { key: 'live' })).toBe('Continue the live reveal');
    expect(listGroup({ key: 'live' })).toBe('active');
    expect(nextStep(campaign({ unclaimedCount: 5 }), { key: 'completed' })).toBe('5 prizes not claimed');
  });

  it('says "Draw" for the closed stage except for live online draws, which say "Reveal"', () => {
    expect(nextStep(campaign({ drawType: 'digital' }), { key: 'closed' })).toMatch(/^Draw 2 Nov/);
    expect(nextStep(campaign({ drawType: 'physical' }), { key: 'closed' })).toMatch(/^Draw 2 Nov/);
    expect(nextStep(campaign({ drawType: 'live_online' }), { key: 'closed' })).toMatch(/^Reveal 2 Nov/);
  });
});

describe('dates', () => {
  it('counts days left, rounding up', () => {
    expect(daysUntil(new Date(now.getTime() + 10.2 * DAY), now)).toBe(11);
    expect(daysUntil(new Date(now.getTime() - DAY), now)).toBe(0);
  });

  it('places today and entries close on the timeline', () => {
    const pos = timelinePosition({
      start: '2026-10-05T00:00:00.000Z',
      close: '2026-10-31T00:00:00.000Z',
      reveal: '2026-11-02T00:00:00.000Z',
      now: new Date('2026-10-19T00:00:00.000Z'),
    });
    expect(pos.today).toBe(50);
    expect(Math.round(pos.close)).toBe(93);
  });

  it('formats days', () => {
    expect(formatDay('2026-10-31T18:29:00.000Z')).toBe('31 Oct');
  });
});

describe('draw type and prize level wording', () => {
  it('names the three draw types and prize levels', () => {
    expect(DRAW_TYPE_LABEL).toEqual({ physical: 'Physical draw', live_online: 'Live online draw', digital: 'Digital draw' });
    expect(PRIZE_LEVEL_LABEL).toEqual({ 1: 'Grand Prize', 2: 'Second Prize', 3: 'Third Prize' });
  });

  it('describes the minimum bill', () => {
    expect(describeMinBill(1000)).toBe('Bills of ₹1,000 or more get 1 entry');
    expect(describeMinBill(0)).toBe('Every bill gets 1 entry');
  });
});
