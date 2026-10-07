import { parseAmount, formatINR, suggestSplit, summarize } from '@/lib/luckyDraw/calculator';

describe('parseAmount', () => {
  it('reads digits typed with commas, spaces or a rupee sign', () => {
    expect(parseAmount('75,000')).toBe(75000);
    expect(parseAmount('₹ 1,00,000')).toBe(100000);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount(1200)).toBe(1200);
  });
});

describe('formatINR', () => {
  it('groups digits the Indian way', () => {
    expect(formatINR(75000)).toBe('₹75,000');
    expect(formatINR(100000)).toBe('₹1,00,000');
    expect(formatINR(950)).toBe('₹950');
  });
});

describe('suggestSplit', () => {
  it('splits ₹75,000 into 1 x 20,000, 5 x 5,000 and 10 x 3,000', () => {
    expect(suggestSplit(75000)).toEqual([
      { prizeDescription: 'Grand prize', prizeValue: 20000, quantity: 1 },
      { prizeDescription: 'Second prize', prizeValue: 5000, quantity: 5 },
      { prizeDescription: 'Third prize', prizeValue: 3000, quantity: 10 },
    ]);
  });

  it('always adds up to exactly the budget', () => {
    for (const pool of [50000, 100000, 12345, 99999, 3000]) {
      const total = suggestSplit(pool).reduce((sum, p) => sum + p.prizeValue * p.quantity, 0);
      expect(total).toBe(pool);
    }
  });

  it('gives one grand prize when the budget is too small to split', () => {
    expect(suggestSplit(1500)).toEqual([{ prizeDescription: 'Grand prize', prizeValue: 1500, quantity: 1 }]);
  });

  it('returns nothing for an empty budget', () => {
    expect(suggestSplit(0)).toEqual([]);
  });
});

describe('summarize', () => {
  const categories = [
    { prizeDescription: 'Grand prize', prizeValue: 20000, quantity: 1 },
    { prizeDescription: 'Second prize', prizeValue: 5000, quantity: 5 },
    { prizeDescription: 'Third prize', prizeValue: 3000, quantity: 10 },
  ];

  it('works out cost, winners, cost per entry and chance to win', () => {
    const s = summarize({ categories, expectedEntries: 1000 });
    expect(s.totalCost).toBe(75000);
    expect(s.totalWinners).toBe(16);
    expect(s.costPerEntry).toBe(75);
    expect(s.chanceOneIn).toBe(63);
    expect(s.shares.map((x) => x.percent)).toEqual([27, 33, 40]);
  });

  it('leaves per-entry figures empty without expected entries', () => {
    const s = summarize({ categories, expectedEntries: 0 });
    expect(s.costPerEntry).toBeNull();
    expect(s.chanceOneIn).toBeNull();
  });

  it('says everyone wins when there are fewer entries than prizes', () => {
    expect(summarize({ categories, expectedEntries: 10 }).chanceOneIn).toBe(1);
  });

  it('skips rows with no winners or no value and counts them', () => {
    const s = summarize({
      categories: [...categories, { prizeDescription: 'Half done', prizeValue: 0, quantity: 3 }],
      expectedEntries: 1000,
    });
    expect(s.totalCost).toBe(75000);
    expect(s.incompleteRows).toBe(1);
  });

  it('compares the cost with an optional budget', () => {
    expect(summarize({ categories, budgetLimit: 80000 }).budget).toEqual({ limit: 80000, difference: 5000, over: false });
    expect(summarize({ categories, budgetLimit: 70000 }).budget).toEqual({ limit: 70000, difference: 5000, over: true });
    expect(summarize({ categories }).budget).toBeNull();
  });
});
