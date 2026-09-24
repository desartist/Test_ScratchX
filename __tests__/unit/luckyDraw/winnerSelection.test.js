import { createSeededRng, selectWinners, orderPrizesForDraw } from '@/lib/services/luckyDraw/winnerSelection';

const entry = (id, phone, entriesGranted = 1) => ({ _id: id, customerPhone: phone, entriesGranted });
const prizes = [
  { rank: 2, prizeDescription: 'Mixer' },
  { rank: 1, prizeDescription: 'TV' },
];

describe('createSeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRng('deadbeef');
    const b = createSeededRng('deadbeef');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces values in [0, 1)', () => {
    const rng = createSeededRng('00000001');
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('selectWinners', () => {
  it('assigns prizes in ascending rank order regardless of input order', () => {
    const entries = [entry('e1', '9000000001'), entry('e2', '9000000002'), entry('e3', '9000000003')];
    const winners = selectWinners(entries, prizes, createSeededRng('12345678'));
    expect(winners.map((w) => w.rank)).toEqual([1, 2]);
    expect(winners.map((w) => w.prizeDescription)).toEqual(['TV', 'Mixer']);
  });

  it('never lets one customer win two prizes, however many entries they hold', () => {
    const entries = [
      entry('a1', '9000000001', 50),
      entry('a2', '9000000001', 50),
      entry('b1', '9000000002', 1),
    ];
    for (let i = 0; i < 200; i++) {
      const seed = i.toString(16).padStart(8, '0');
      const winners = selectWinners(entries, prizes, createSeededRng(seed));
      const phones = winners.map((w) => w.entry.customerPhone);
      expect(new Set(phones).size).toBe(phones.length);
    }
  });

  it('returns fewer winners than prizes when there are fewer distinct customers', () => {
    const winners = selectWinners([entry('a1', '9000000001'), entry('a2', '9000000001')], prizes);
    expect(winners).toHaveLength(1);
    expect(winners[0].rank).toBe(1);
  });

  it('returns no winners for an empty pool', () => {
    expect(selectWinners([], prizes)).toEqual([]);
  });

  it('ignores entries that grant nothing', () => {
    expect(selectWinners([entry('z', '9000000009', 0)], prizes)).toEqual([]);
  });

  it('picks the first entry when the random value is 0 and the last when it is just under 1', () => {
    const entries = [entry('e1', '9000000001'), entry('e2', '9000000002'), entry('e3', '9000000003')];
    expect(selectWinners(entries, [{ rank: 1, prizeDescription: 'TV' }], () => 0)[0].entry._id).toBe('e1');
    expect(
      selectWinners(entries, [{ rank: 1, prizeDescription: 'TV' }], () => 0.999999)[0].entry._id,
    ).toBe('e3');
  });

  it('weights the pick by entriesGranted', () => {
    const entries = [entry('heavy', '9000000001', 9), entry('light', '9000000002', 1)];
    let heavyWins = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const seed = i.toString(16).padStart(8, '0');
      const [winner] = selectWinners(entries, [{ rank: 1, prizeDescription: 'TV' }], createSeededRng(seed));
      if (winner.entry._id === 'heavy') heavyWins++;
    }
    expect(heavyWins / trials).toBeGreaterThan(0.85);
    expect(heavyWins / trials).toBeLessThan(0.95);
  });

  it('is reproducible from the seed', () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry(`e${i}`, `90000000${String(i).padStart(2, '0')}`, (i % 3) + 1));
    const first = selectWinners(entries, prizes, createSeededRng('cafebabe')).map((w) => w.entry._id);
    const second = selectWinners(entries, prizes, createSeededRng('cafebabe')).map((w) => w.entry._id);
    expect(first).toEqual(second);
  });
});

describe('prizes tied to bill ranges', () => {
  const at = (id, phone, tierIndex, entriesGranted = 1) => ({ _id: id, customerPhone: phone, tierIndex, entriesGranted });
  const seed = (i) => createSeededRng(i.toString(16).padStart(8, '0'));

  it('only draws a restricted prize from entries in an eligible range', () => {
    const entries = [at('low1', '9000000001', 0, 5), at('low2', '9000000002', 0, 5), at('high', '9000000003', 1, 1)];
    for (let i = 0; i < 100; i++) {
      const [winner] = selectWinners(entries, [{ rank: 1, prizeDescription: 'TV', tierIndexes: [1] }], seed(i));
      expect(winner.entry._id).toBe('high'); // even though the low range holds far more entries
    }
  });

  it('a prize with no ranges listed is open to everyone', () => {
    const entries = [at('low', '9000000001', 0), at('high', '9000000002', 1)];
    const winners = new Set();
    for (let i = 0; i < 100; i++) winners.add(selectWinners(entries, [{ rank: 1, prizeDescription: 'P', tierIndexes: [] }], seed(i))[0].entry._id);
    expect(winners).toEqual(new Set(['low', 'high']));
  });

  it('skips a prize nobody is eligible for and still draws the rest', () => {
    const entries = [at('low1', '9000000001', 0), at('low2', '9000000002', 0)];
    const winners = selectWinners(
      entries,
      [{ rank: 1, prizeDescription: 'TV', tierIndexes: [1] }, { rank: 2, prizeDescription: 'Phone', tierIndexes: [0] }],
      seed(1),
      { ordered: true },
    );
    expect(winners.map((w) => w.rank)).toEqual([2]);
  });

  it('entries with no recorded range cannot win a range-restricted prize', () => {
    const entries = [{ _id: 'old', customerPhone: '9000000001', entriesGranted: 3 }];
    expect(selectWinners(entries, [{ rank: 1, prizeDescription: 'TV', tierIndexes: [0] }], seed(1))).toEqual([]);
  });

  it('a customer with entries in two ranges still wins at most one prize', () => {
    const entries = [at('a-low', '9000000001', 0, 9), at('a-high', '9000000001', 1, 9), at('b-low', '9000000002', 0, 1)];
    const prizes = [{ rank: 1, prizeDescription: 'TV', tierIndexes: [1] }, { rank: 2, prizeDescription: 'Phone', tierIndexes: [0] }];
    for (let i = 0; i < 100; i++) {
      const winners = selectWinners(entries, prizes, seed(i), { ordered: true });
      expect(winners.map((w) => w.entry.customerPhone)).toEqual(['9000000001', '9000000002']);
    }
  });

  it('keeps the given order when told it is already ordered', () => {
    const entries = [at('e1', '9000000001', 0), at('e2', '9000000002', 0)];
    const winners = selectWinners(entries, [{ rank: 2, prizeDescription: 'Phone', tierIndexes: [] }, { rank: 1, prizeDescription: 'TV', tierIndexes: [] }], seed(3), { ordered: true });
    expect(winners.map((w) => w.rank)).toEqual([2, 1]);
  });
});

describe('orderPrizesForDraw', () => {
  const prizes = [
    { rank: 1, prizeDescription: 'Phone', tierIndexes: [0] },
    { rank: 2, prizeDescription: 'Mixer', tierIndexes: [0] },
    { rank: 3, prizeDescription: 'TV', tierIndexes: [1] },
  ];

  it('shared: rank order, and range restrictions are ignored', () => {
    const ordered = orderPrizesForDraw(prizes, 'shared');
    expect(ordered.map((p) => p.rank)).toEqual([1, 2, 3]);
    expect(ordered.every((p) => p.tierIndexes.length === 0)).toBe(true);
  });

  it('restricted: rank order, restrictions kept', () => {
    const ordered = orderPrizesForDraw(prizes, 'restricted');
    expect(ordered.map((p) => p.rank)).toEqual([1, 2, 3]);
    expect(ordered[2].tierIndexes).toEqual([1]);
  });

  it('pool_per_tier: highest range first, then by rank', () => {
    expect(orderPrizesForDraw(prizes, 'pool_per_tier').map((p) => p.rank)).toEqual([3, 1, 2]);
  });

  it('does not change the input', () => {
    const copy = JSON.parse(JSON.stringify(prizes));
    orderPrizesForDraw(prizes, 'pool_per_tier');
    expect(prizes).toEqual(copy);
  });
});
