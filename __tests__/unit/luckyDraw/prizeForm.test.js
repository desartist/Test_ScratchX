import { sortedPositions, prizeTierIndexes, dropTierRow, effectiveMode, formHints } from '@/lib/luckyDraw/prizeForm';

const row = (minAmount, entriesGranted = '1') => ({ minAmount: String(minAmount), maxAmount: '', entriesGranted });

describe('sortedPositions', () => {
  it('maps each form row to its position after sorting by minimum', () => {
    // rows typed in the order 1000, 0, 500
    expect(sortedPositions([row(1000), row(0), row(500)])).toEqual({ 0: 2, 1: 0, 2: 1 });
  });

  it('keeps form order for equal minimums', () => {
    expect(sortedPositions([row(100), row(100)])).toEqual({ 0: 0, 1: 1 });
  });

  it('is the identity when rows are already sorted', () => {
    expect(sortedPositions([row(0), row(500), row(1000)])).toEqual({ 0: 0, 1: 1, 2: 2 });
  });
});

describe('prizeTierIndexes', () => {
  it('translates the rows a prize is tied to into sorted range numbers', () => {
    const tiers = [row(1000), row(0)]; // typed high first
    expect(prizeTierIndexes([0], tiers)).toEqual([1]); // "first row" is the top range
    expect(prizeTierIndexes([1], tiers)).toEqual([0]);
    expect(prizeTierIndexes([0, 1], tiers)).toEqual([0, 1]);
  });

  it('returns an empty list for no rows, and drops rows that do not exist', () => {
    expect(prizeTierIndexes([], [row(0)])).toEqual([]);
    expect(prizeTierIndexes(undefined, [row(0)])).toEqual([]);
    expect(prizeTierIndexes([9], [row(0), row(500)])).toEqual([]);
  });
});

describe('dropTierRow', () => {
  const prizes = [{ rows: [0] }, { rows: [1, 2] }, { rows: [] }];

  it('removes references to the deleted row and shifts later ones down', () => {
    expect(dropTierRow(prizes, 1)).toEqual([{ rows: [0] }, { rows: [1] }, { rows: [] }]);
  });

  it('does not change the input', () => {
    const copy = JSON.parse(JSON.stringify(prizes));
    dropTierRow(prizes, 0);
    expect(prizes).toEqual(copy);
  });
});

describe('effectiveMode', () => {
  it('needs at least two ranges to tie prizes to ranges', () => {
    expect(effectiveMode('pool_per_tier', 1)).toBe('shared');
    expect(effectiveMode('restricted', 1)).toBe('shared');
    expect(effectiveMode('pool_per_tier', 2)).toBe('pool_per_tier');
    expect(effectiveMode('shared', 3)).toBe('shared');
  });
});

describe('formHints', () => {
  it('warns that a low customer limit makes every bill equally likely to win', () => {
    const hints = formHints({ tiers: [row(500, '50'), row(10000, '50')], maxEntries: '1' });
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatch(/same chance/i);
    expect(hints[0]).toMatch(/1 entry/);
  });

  it('warns when the limit caps some ranges but not all', () => {
    const hints = formHints({ tiers: [row(0, '1'), row(1000, '10')], maxEntries: '5' });
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatch(/capped at 5/i);
  });

  it('warns when every range gives the same entries', () => {
    const hints = formHints({ tiers: [row(0, '2'), row(1000, '2')], maxEntries: '' });
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatch(/same number of entries/i);
  });

  it('says nothing for a sensible setup, a single range, or blank fields', () => {
    expect(formHints({ tiers: [row(0, '1'), row(1000, '3')], maxEntries: '' })).toEqual([]);
    expect(formHints({ tiers: [row(0, '1'), row(1000, '3')], maxEntries: '10' })).toEqual([]);
    expect(formHints({ tiers: [row(0, '5')], maxEntries: '1' })).toEqual([]);
    expect(formHints({ tiers: [row(0, ''), row(1000, '')], maxEntries: '' })).toEqual([]);
  });
});
