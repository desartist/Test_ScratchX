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

/** The client's worked example, so the calculator opens showing the method. */
export const CALCULATOR_DEFAULTS = {
  dailyWalkIns: '22',
  extraPercent: '10',
  days: '30',
  normalBill: '1,200',
  campaignBill: '2,000',
  spendPerEntry: '100',
  grand: { prizeValue: '20,000' },
  second: { quantity: '2', prizeValue: '5,000' },
  third: { quantity: '5', prizeValue: '2,000' },
};

/**
 * Expected entries = (daily walk-ins + extra footfall %) × days. People per day rounds up, using
 * integer maths so 20 + 10% is exactly 22 (20 × 1.1 in floating point is 22.000000000000004).
 */
export function planEntries({ dailyWalkIns, extraPercent = 10, days }) {
  const walkIns = parseAmount(dailyWalkIns);
  const extra = parseAmount(extraPercent);
  const dayCount = parseAmount(days);
  const perDay = Math.ceil((walkIns * (100 + extra)) / 100);
  return { walkIns, extra, days: dayCount, perDay, entries: perDay * dayCount };
}

/** How much more each customer spends during the draw, and what that adds up to over every entry. */
export function billIncrease({ normalBill, campaignBill, entries }) {
  const normal = parseAmount(normalBill);
  const campaign = parseAmount(campaignBill);
  const perBill = campaign - normal;
  return { normal, campaign, perBill, extraSales: perBill > 0 ? perBill * parseAmount(entries) : 0 };
}

/** Budget = entries × what the owner wants to spend per entry. */
export function planBudget({ entries, spendPerEntry }) {
  const entryCount = parseAmount(entries);
  const perEntry = parseAmount(spendPerEntry);
  return { entries: entryCount, spendPerEntry: perEntry, budget: entryCount * perEntry };
}

/**
 * The Grand / 2nd / 3rd prize table and what it means. A level without winners or a value is left
 * out of the totals (the 3rd prize is optional). budgetLeft is negative when the prizes cost more.
 */
export function prizePoolSummary({ grand, second, third, entries, budget, extraSales }) {
  const levels = [
    { rank: 1, prizeValue: parseAmount(grand?.prizeValue), quantity: 1 },
    { rank: 2, prizeValue: parseAmount(second?.prizeValue), quantity: parseAmount(second?.quantity) },
    { rank: 3, prizeValue: parseAmount(third?.prizeValue), quantity: parseAmount(third?.quantity) },
  ].map((level) => ({ ...level, total: level.prizeValue * level.quantity }));
  const counted = levels.filter((level) => level.prizeValue > 0 && level.quantity > 0);

  const totalCost = counted.reduce((sum, level) => sum + level.total, 0);
  const totalWinners = counted.reduce((sum, level) => sum + level.quantity, 0);
  const entryCount = parseAmount(entries);
  const budgetAmount = parseAmount(budget);
  const extra = parseAmount(extraSales);

  return {
    levels,
    totalCost,
    totalWinners,
    budgetLeft: budgetAmount > 0 ? budgetAmount - totalCost : null,
    shareOfExtraSales: extra > 0 && totalCost > 0 ? Math.round((totalCost * 100) / extra) : null,
    chanceOneIn: entryCount > 0 && totalWinners > 0 ? Math.max(1, Math.round(entryCount / totalWinners)) : null,
    costPerEntry: entryCount > 0 && totalCost > 0 ? Math.round(totalCost / entryCount) : null,
  };
}
