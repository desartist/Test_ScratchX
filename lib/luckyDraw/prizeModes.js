import { PRIZE_MODES } from './constants';

/**
 * How prizes relate to entry ranges (tiers). Tiers are identified by their position after sorting
 * by minAmount ascending; a prize's tierIndexes list the ranges whose entries may win it.
 *
 *  shared         one prize list for everybody (tierIndexes are ignored)
 *  pool_per_tier  each prize belongs to exactly one range; every range needs at least one prize
 *  restricted     a prize may be limited to some ranges; none listed = open to everyone
 *
 * Returns an error message, or null when the allocation is valid.
 */
export function validatePrizeAllocation(prizeMode, prizes, tierCount) {
  if (!PRIZE_MODES.includes(prizeMode)) {
    return 'Choose how prizes are split: the same for everyone, a pool per range, or restricted prizes';
  }
  if (prizeMode === 'shared') return null;
  if (tierCount < 2) return 'Prizes can only be tied to ranges when there are at least two entry ranges';

  for (const prize of prizes) {
    const indexes = prize.tierIndexes || [];
    if (indexes.some((i) => !Number.isInteger(i) || i < 0 || i >= tierCount)) {
      return 'A prize points at an entry range that does not exist';
    }
  }

  if (prizeMode === 'pool_per_tier') {
    if (prizes.some((p) => (p.tierIndexes || []).length !== 1)) {
      return 'Each prize must belong to exactly one entry range';
    }
    if (new Set(prizes.map((p) => p.tierIndexes[0])).size !== tierCount) {
      return 'Every entry range needs at least one prize';
    }
    return null;
  }

  // restricted
  const openToAll = prizes.some((p) => (p.tierIndexes || []).length === 0);
  const covered = new Set(prizes.flatMap((p) => p.tierIndexes || []));
  if (!openToAll && covered.size !== tierCount) {
    return 'Every entry range must be able to win at least one prize';
  }
  return null;
}
