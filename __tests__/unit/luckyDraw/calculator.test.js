import { parseAmount, formatINR, planEntries, billIncrease, planBudget, prizePoolSummary, CALCULATOR_DEFAULTS } from '@/lib/luckyDraw/calculator';

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

describe("the client's planning example", () => {
  it('turns walk-ins into entries: 22/day + 10% = 25/day × 30 days = 750', () => {
    expect(planEntries({ dailyWalkIns: '22', extraPercent: '10', days: '30' })).toEqual({ walkIns: 22, extra: 10, days: 30, perDay: 25, entries: 750 });
  });

  it('rounds people per day up, with exact integer maths', () => {
    expect(planEntries({ dailyWalkIns: 20, extraPercent: 10, days: 1 }).perDay).toBe(22);
    expect(planEntries({ dailyWalkIns: 21, extraPercent: 10, days: 1 }).perDay).toBe(24);
    expect(planEntries({ dailyWalkIns: 22, extraPercent: 0, days: 2 }).entries).toBe(44);
  });

  it('works out the bill increase and the extra sales', () => {
    expect(billIncrease({ normalBill: '1,200', campaignBill: '2,000', entries: 750 })).toEqual({ normal: 1200, campaign: 2000, perBill: 800, extraSales: 600000 });
  });

  it('counts no extra sales when the campaign bill is not higher', () => {
    expect(billIncrease({ normalBill: 2000, campaignBill: 1500, entries: 750 })).toMatchObject({ perBill: -500, extraSales: 0 });
  });

  it('sets the budget from the spend per entry: 750 × ₹100 = ₹75,000', () => {
    expect(planBudget({ entries: 750, spendPerEntry: '100' })).toEqual({ entries: 750, spendPerEntry: 100, budget: 75000 });
  });

  it('adds up the prize pool: ₹40,000 for 8 winners, ₹35,000 of the budget left', () => {
    const result = prizePoolSummary({
      grand: { prizeValue: '20,000' },
      second: { quantity: '2', prizeValue: '5,000' },
      third: { quantity: '5', prizeValue: '2,000' },
      entries: 750,
      budget: 75000,
      extraSales: 600000,
    });
    expect(result.levels.map((l) => [l.rank, l.quantity, l.prizeValue, l.total])).toEqual([
      [1, 1, 20000, 20000],
      [2, 2, 5000, 10000],
      [3, 5, 2000, 10000],
    ]);
    expect(result).toMatchObject({ totalCost: 40000, totalWinners: 8, budgetLeft: 35000, shareOfExtraSales: 7, chanceOneIn: 94, costPerEntry: 53 });
  });

  it('reports going over budget as a negative amount left, and skips an empty 3rd prize', () => {
    const result = prizePoolSummary({ grand: { prizeValue: 80000 }, second: { quantity: 1, prizeValue: 5000 }, third: { quantity: '', prizeValue: '' }, entries: 0, budget: 75000, extraSales: 0 });
    expect(result).toMatchObject({ totalCost: 85000, totalWinners: 2, budgetLeft: -10000, shareOfExtraSales: null, chanceOneIn: null, costPerEntry: null });
  });

  it('opens on the client example', () => {
    expect(CALCULATOR_DEFAULTS).toEqual({
      dailyWalkIns: '22', extraPercent: '10', days: '30',
      normalBill: '1,200', campaignBill: '2,000', spendPerEntry: '100',
      grand: { prizeValue: '20,000' }, second: { quantity: '2', prizeValue: '5,000' }, third: { quantity: '5', prizeValue: '2,000' },
    });
  });
});
