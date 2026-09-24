import { validateEntryTiers, resolveEntries, resolveTier } from '@/lib/luckyDraw/entryTiers';

const tiers = [
  { minAmount: 500, maxAmount: 1000, entriesGranted: 1 },
  { minAmount: 1000, maxAmount: 5000, entriesGranted: 3 },
  { minAmount: 5000, maxAmount: null, entriesGranted: 10 },
];

describe('resolveEntries', () => {
  it('returns the entries of the tier the bill falls in', () => {
    expect(resolveEntries(tiers, 750)).toBe(1);
    expect(resolveEntries(tiers, 2500)).toBe(3);
  });

  it('treats minAmount as inclusive and maxAmount as exclusive', () => {
    expect(resolveEntries(tiers, 500)).toBe(1);
    expect(resolveEntries(tiers, 999.99)).toBe(1);
    expect(resolveEntries(tiers, 1000)).toBe(3);
  });

  it('supports an open-ended top tier', () => {
    expect(resolveEntries(tiers, 5000)).toBe(10);
    expect(resolveEntries(tiers, 999999)).toBe(10);
  });

  it('returns 0 below the first tier', () => {
    expect(resolveEntries(tiers, 499.99)).toBe(0);
    expect(resolveEntries(tiers, 0)).toBe(0);
  });

  it('returns 0 for a bill that falls in a gap between tiers', () => {
    const gapped = [
      { minAmount: 0, maxAmount: 500, entriesGranted: 1 },
      { minAmount: 1000, maxAmount: null, entriesGranted: 2 },
    ];
    expect(resolveEntries(gapped, 750)).toBe(0);
  });

  it('returns 0 for invalid amounts', () => {
    expect(resolveEntries(tiers, NaN)).toBe(0);
    expect(resolveEntries(tiers, -5)).toBe(0);
    expect(resolveEntries(tiers, undefined)).toBe(0);
    expect(resolveEntries(tiers, '2500')).toBe(0);
  });
});

describe('validateEntryTiers', () => {
  it('accepts a valid, contiguous set', () => {
    expect(validateEntryTiers(tiers)).toBeNull();
  });

  it('accepts a single open-ended tier', () => {
    expect(validateEntryTiers([{ minAmount: 0, maxAmount: null, entriesGranted: 1 }])).toBeNull();
  });

  it('accepts gaps (they simply do not qualify)', () => {
    expect(
      validateEntryTiers([
        { minAmount: 0, maxAmount: 500, entriesGranted: 1 },
        { minAmount: 1000, maxAmount: null, entriesGranted: 2 },
      ]),
    ).toBeNull();
  });

  it('rejects an empty or missing list', () => {
    expect(validateEntryTiers([])).toBe('At least one entry tier is required');
    expect(validateEntryTiers(undefined)).toBe('At least one entry tier is required');
  });

  it('rejects overlapping tiers', () => {
    expect(
      validateEntryTiers([
        { minAmount: 0, maxAmount: 1000, entriesGranted: 1 },
        { minAmount: 500, maxAmount: null, entriesGranted: 2 },
      ]),
    ).toBe('Entry tiers must not overlap');
  });

  it('rejects a non-final tier with no maximum', () => {
    expect(
      validateEntryTiers([
        { minAmount: 0, maxAmount: null, entriesGranted: 1 },
        { minAmount: 1000, maxAmount: null, entriesGranted: 2 },
      ]),
    ).toBe('Only the last tier can have no maximum');
  });

  it('rejects a maximum that is not above the minimum', () => {
    expect(validateEntryTiers([{ minAmount: 500, maxAmount: 500, entriesGranted: 1 }])).toBe(
      'Tier maximum must be greater than its minimum',
    );
  });

  it('rejects non-integer or sub-1 entries', () => {
    expect(validateEntryTiers([{ minAmount: 0, maxAmount: null, entriesGranted: 1.5 }])).toBe(
      'Entries per tier must be a whole number of at least 1',
    );
    expect(validateEntryTiers([{ minAmount: 0, maxAmount: null, entriesGranted: 0 }])).toBe(
      'Entries per tier must be a whole number of at least 1',
    );
  });

  it('rejects a negative minimum', () => {
    expect(validateEntryTiers([{ minAmount: -1, maxAmount: null, entriesGranted: 1 }])).toBe(
      'Tier minimum must be 0 or more',
    );
  });
});

describe('resolveTier', () => {
  it('returns the position of the range and its entries', () => {
    expect(resolveTier(tiers, 750)).toEqual({ index: 0, entriesGranted: 1 });
    expect(resolveTier(tiers, 2500)).toEqual({ index: 1, entriesGranted: 3 });
    expect(resolveTier(tiers, 5000)).toEqual({ index: 2, entriesGranted: 10 });
  });

  it('returns null when the bill does not qualify', () => {
    expect(resolveTier(tiers, 100)).toBeNull();
    expect(resolveTier(tiers, NaN)).toBeNull();
    expect(resolveTier(tiers, '2500')).toBeNull();
  });
});
