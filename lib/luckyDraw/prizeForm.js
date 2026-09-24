// Pure helpers for the "new Lucky Draw" form. The form keeps entry ranges in the order the owner
// typed them; the server stores them sorted by minimum and prizes refer to that sorted position.

/** Form row index -> position after sorting rows by minimum amount (ties keep form order). */
export function sortedPositions(tierRows) {
  const order = tierRows
    .map((tier, index) => ({ index, min: Number(tier.minAmount) }))
    .sort((a, b) => a.min - b.min || a.index - b.index);
  const positions = {};
  order.forEach((entry, position) => {
    positions[entry.index] = position;
  });
  return positions;
}

/** The sorted range numbers a prize is tied to, from the form rows it was tied to. */
export function prizeTierIndexes(prizeRows, tierRows) {
  const positions = sortedPositions(tierRows);
  const indexes = (prizeRows || []).map((row) => positions[row]).filter((position) => position !== undefined);
  return [...new Set(indexes)].sort((a, b) => a - b);
}

/** Removes a range row: drops prize references to it and shifts later references down. */
export function dropTierRow(prizes, removedRow) {
  return prizes.map((prize) => ({
    ...prize,
    rows: (prize.rows || []).filter((row) => row !== removedRow).map((row) => (row > removedRow ? row - 1 : row)),
  }));
}

/** Tying prizes to ranges needs at least two ranges; otherwise prizes are simply shared. */
export function effectiveMode(mode, tierCount) {
  return tierCount >= 2 ? mode : 'shared';
}

const entriesText = (n) => `${n} ${n === 1 ? 'entry' : 'entries'}`;

/** Non-blocking advice about entry settings that make bill size irrelevant. */
export function formHints({ tiers, maxEntries }) {
  const hints = [];
  const entries = tiers.map((t) => Number(t.entriesGranted)).filter((n) => Number.isFinite(n) && n > 0);
  if (tiers.length < 2 || entries.length < 2) return hints;

  const cap = maxEntries === '' || maxEntries == null ? null : Number(maxEntries);
  const hasCap = cap !== null && Number.isFinite(cap) && cap > 0;

  if (hasCap && cap <= Math.min(...entries)) {
    hints.push(
      `With a limit of ${entriesText(cap)} per customer, every customer ends up with the same chance to win, whatever their bill.`,
    );
  } else if (hasCap && cap < Math.max(...entries)) {
    hints.push(`Ranges that give more than ${cap} entries are capped at ${cap} per customer.`);
  } else if (new Set(entries).size === 1) {
    hints.push('Every range gives the same number of entries, so a bigger bill does not improve a customer’s chances.');
  }
  return hints;
}
