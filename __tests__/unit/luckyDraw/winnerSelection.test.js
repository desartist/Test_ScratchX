import { createSeededRng, selectWinners } from '@/lib/services/luckyDraw/winnerSelection';

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
