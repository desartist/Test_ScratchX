// Prize calculator maths. Pure, so the calculator page and the create form share it.

/** "₹ 1,00,000" / "75000" / 75000 -> 75000. Anything without digits is 0. */
export function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

const grouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatNumber = (value) => grouping.format(Math.round(value || 0));
export const formatINR = (value) => `₹${formatNumber(value)}`;

const roundTo100 = (value) => Math.round(value / 100) * 100;

/**
 * A starting split for a prize pool, in the proportions of the ₹75,000 example
 * (1 x 20,000 + 5 x 5,000 + 10 x 3,000). The grand prize absorbs rounding so the
 * split always adds up to exactly the pool. Small pools get a single grand prize.
 */
export function suggestSplit(pool) {
  const budget = parseAmount(pool);
  if (budget <= 0) return [];

  const third = roundTo100((budget * 30) / 75 / 10);
  const second = roundTo100((budget * 25) / 75 / 5);
  const grand = budget - second * 5 - third * 10;

  if (third < 100 || grand < second) {
    return [{ prizeDescription: 'Grand prize', prizeValue: budget, quantity: 1 }];
  }
  return [
    { prizeDescription: 'Grand prize', prizeValue: grand, quantity: 1 },
    { prizeDescription: 'Second prize', prizeValue: second, quantity: 5 },
    { prizeDescription: 'Third prize', prizeValue: third, quantity: 10 },
  ];
}

/**
 * Totals for the calculator. Rows missing a value or winners are skipped and counted
 * in incompleteRows, so a half-typed row never shows a wrong total.
 */
export function summarize({ categories = [], expectedEntries = 0, budgetLimit = 0 }) {
  const rows = categories.map((c) => ({
    prizeDescription: c.prizeDescription,
    prizeValue: parseAmount(c.prizeValue),
    quantity: parseAmount(c.quantity),
  }));
  const complete = rows.filter((r) => r.prizeValue > 0 && r.quantity > 0);

  const totalCost = complete.reduce((sum, r) => sum + r.prizeValue * r.quantity, 0);
  const totalWinners = complete.reduce((sum, r) => sum + r.quantity, 0);
  const entries = parseAmount(expectedEntries);
  const limit = parseAmount(budgetLimit);

  return {
    totalCost,
    totalWinners,
    incompleteRows: rows.length - complete.length,
    costPerEntry: entries > 0 && totalCost > 0 ? Math.round(totalCost / entries) : null,
    chanceOneIn: entries > 0 && totalWinners > 0 ? Math.max(1, Math.round(entries / totalWinners)) : null,
    shares: complete.map((r) => ({
      ...r,
      total: r.prizeValue * r.quantity,
      percent: totalCost > 0 ? Math.round((r.prizeValue * r.quantity * 100) / totalCost) : 0,
    })),
    budget: limit > 0 ? { limit, difference: Math.abs(limit - totalCost), over: totalCost > limit } : null,
  };
}
