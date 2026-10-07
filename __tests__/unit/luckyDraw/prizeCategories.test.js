import {
  validatePrizeCategories,
  normalizePrizeCategories,
  expandPrizeSlots,
  revealOrder,
  prizeTotals,
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

describe('normalizePrizeCategories', () => {
  it('numbers prizes in the order given and cleans the fields', () => {
    const [grand, second] = normalizePrizeCategories([
      { prizeDescription: '  Grand prize ', prizeValue: '20000', quantity: '1', imageUrl: tiny },
      { prizeDescription: 'Second prize', prizeValue: 5000, quantity: 5, imageUrl: '' },
    ]);
    expect(grand).toEqual({ rank: 1, prizeDescription: 'Grand prize', prizeValue: 20000, quantity: 1, imageUrl: tiny, tierIndexes: [] });
    expect(second.rank).toBe(2);
    expect(second.imageUrl).toBeNull();
  });
});

describe('expandPrizeSlots', () => {
  it('repeats each category once per winner, in rank order', () => {
    const slots = expandPrizeSlots(normalizePrizeCategories(example));
    expect(slots).toHaveLength(16);
    expect(slots[0]).toMatchObject({ rank: 1, prizeDescription: 'Grand prize', prizeValue: 20000 });
    expect(slots.filter((s) => s.rank === 3)).toHaveLength(10);
  });

  it('treats a missing quantity as one winner', () => {
    expect(expandPrizeSlots([{ rank: 1, prizeDescription: 'TV', prizeValue: 1 }])).toHaveLength(1);
  });
});

describe('revealOrder', () => {
  it('reveals the smallest prize first and the grand prize last', () => {
    expect(revealOrder(normalizePrizeCategories(example))).toEqual([3, 2, 1]);
  });

  it('breaks value ties by revealing the lower-ranked prize first', () => {
    const tiers = [
      { rank: 1, prizeValue: 100 },
      { rank: 2, prizeValue: 100 },
    ];
    expect(revealOrder(tiers)).toEqual([2, 1]);
  });
});

describe('prizeTotals', () => {
  it('adds up the cost and the winners', () => {
    expect(prizeTotals(normalizePrizeCategories(example))).toEqual({ totalValue: 75000, totalWinners: 16 });
  });
});
