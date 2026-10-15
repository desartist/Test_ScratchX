import {
  validatePrizeCategories,
  expandPrizeSlots,
  revealOrder,
  prizeTotals,
  validatePrizeLevels,
  normalizePrizeLevels,
} from '@/lib/luckyDraw/prizeCategories';

const tiny = 'data:image/jpeg;base64,' + 'A'.repeat(100);
const example = [
  { prizeDescription: 'Grand prize', prizeValue: 20000, quantity: 1, imageUrl: tiny },
  { prizeDescription: 'Second prize', prizeValue: 5000, quantity: 5 },
  { prizeDescription: 'Third prize', prizeValue: 3000, quantity: 10 },
];

describe('validatePrizeCategories', () => {
  it('accepts the ₹75,000 example', () => {
    expect(validatePrizeCategories(example)).toBeNull();
  });

  it('needs at least one category and at most 20', () => {
    expect(validatePrizeCategories([])).toMatch(/at least one prize/i);
    const many = Array.from({ length: 21 }, (_, i) => ({ prizeDescription: `P${i}`, prizeValue: 10, quantity: 1 }));
    expect(validatePrizeCategories(many)).toMatch(/20/);
  });

  it('needs a name and a value above zero for each prize', () => {
    expect(validatePrizeCategories([{ prizeDescription: ' ', prizeValue: 10, quantity: 1 }])).toMatch(/name/i);
    expect(validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 0, quantity: 1 }])).toMatch(/value/i);
    expect(validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 'abc', quantity: 1 }])).toMatch(/value/i);
  });

  it('needs a whole number of winners, 1,000 at most in total', () => {
    expect(validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 10, quantity: 0 }])).toMatch(/winners/i);
    expect(validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 10, quantity: 1.5 }])).toMatch(/winners/i);
    expect(
      validatePrizeCategories([
        { prizeDescription: 'A', prizeValue: 10, quantity: 600 },
        { prizeDescription: 'B', prizeValue: 10, quantity: 401 },
      ]),
    ).toMatch(/1,000/);
  });

  it('accepts no image, and rejects images that are not small JPEG/PNG/WebP data URLs', () => {
    expect(validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 10, quantity: 1, imageUrl: '' }])).toBeNull();
    expect(
      validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 10, quantity: 1, imageUrl: 'https://x.test/a.jpg' }]),
    ).toMatch(/image/i);
    expect(
      validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 10, quantity: 1, imageUrl: 'data:image/svg+xml;base64,AAA' }]),
    ).toMatch(/image/i);
    const huge = 'data:image/png;base64,' + 'A'.repeat(300 * 1024);
    expect(validatePrizeCategories([{ prizeDescription: 'TV', prizeValue: 10, quantity: 1, imageUrl: huge }])).toMatch(/too large/i);
  });
});

describe('expandPrizeSlots', () => {
  const ranked = example.map((p, i) => ({ ...p, rank: i + 1 }));

  it('repeats each category once per winner, in rank order', () => {
    const slots = expandPrizeSlots(ranked);
    expect(slots).toHaveLength(16);
    expect(slots[0]).toMatchObject({ rank: 1, prizeDescription: 'Grand prize', prizeValue: 20000 });
    expect(slots.filter((s) => s.rank === 3)).toHaveLength(10);
  });

  it('treats a missing quantity as one winner', () => {
    expect(expandPrizeSlots([{ rank: 1, prizeDescription: 'TV', prizeValue: 1 }])).toHaveLength(1);
  });
});

describe('revealOrder', () => {
  it('reveals the 3rd prize first, then the 2nd, and the grand prize last, whatever the values', () => {
    expect(revealOrder([{ rank: 1, prizeValue: 100 }, { rank: 2, prizeValue: 5000 }, { rank: 3, prizeValue: 9000 }])).toEqual([3, 2, 1]);
    expect(revealOrder([{ rank: 2, prizeValue: 10 }, { rank: 1, prizeValue: 10 }])).toEqual([2, 1]);
  });
});

describe('prizeTotals', () => {
  it('adds up the cost and the winners', () => {
    const ranked = example.map((p, i) => ({ ...p, rank: i + 1 }));
    expect(prizeTotals(ranked)).toEqual({ totalValue: 75000, totalWinners: 16 });
  });
});

describe('validatePrizeLevels', () => {
  const grand = { rank: 1, prizeDescription: 'Smart TV', prizeValue: 20000, quantity: 1 };
  const second = { rank: 2, prizeDescription: 'Gold coin', prizeValue: 5000, quantity: 2 };
  const third = { rank: 3, prizeDescription: 'Voucher', prizeValue: 2000, quantity: 5 };

  it('accepts Grand + 2nd, and Grand + 2nd + 3rd', () => {
    expect(validatePrizeLevels([grand, second])).toBeNull();
    expect(validatePrizeLevels([third, grand, second])).toBeNull();
  });

  it('needs the grand prize and the 2nd prize, and nothing beyond the 3rd', () => {
    const message = 'Add the Grand Prize and the Second Prize (the Third Prize is optional)';
    expect(validatePrizeLevels([grand])).toBe(message);
    expect(validatePrizeLevels([second, third])).toBe(message);
    expect(validatePrizeLevels([grand, second, { ...third, rank: 4 }])).toBe(message);
    expect(validatePrizeLevels([grand, second, { ...second }])).toBe(message);
    expect(validatePrizeLevels(null)).toBe(message);
  });

  it('keeps the grand prize to exactly one winner', () => {
    expect(validatePrizeLevels([{ ...grand, quantity: 2 }, second])).toBe('The Grand Prize has exactly 1 winner');
  });

  it('still checks names, values and winners of every level', () => {
    expect(validatePrizeLevels([grand, { ...second, prizeValue: 0 }])).toBe('Enter a value in rupees for Gold coin');
    expect(validatePrizeLevels([grand, { ...second, quantity: 0 }])).toBe('Enter how many winners get Gold coin (1 or more)');
  });
});

describe('normalizePrizeLevels', () => {
  it('sorts by rank, cleans the fields and forces one grand prize winner', () => {
    const result = normalizePrizeLevels([
      { rank: 2, prizeDescription: ' Gold coin ', prizeValue: '5000', quantity: '2' },
      { rank: 1, prizeDescription: 'TV', prizeValue: 20000, imageUrl: '' },
    ]);
    expect(result).toEqual([
      { rank: 1, prizeDescription: 'TV', prizeValue: 20000, quantity: 1, imageUrl: null },
      { rank: 2, prizeDescription: 'Gold coin', prizeValue: 5000, quantity: 2, imageUrl: null },
    ]);
  });
});
