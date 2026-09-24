/**
 * mulberry32 PRNG seeded from the first 8 hex characters of `seedHex`.
 * The seed is stored on the LuckyDraw record so a draw can be replayed:
 * same entries (sorted by _id) + same seed = same winners.
 */
export function createSeededRng(seedHex) {
  let a = parseInt(String(seedHex).slice(0, 8), 16) >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The order prizes are drawn in.
 *  shared         rank order; range restrictions are ignored
 *  restricted     rank order; restrictions kept
 *  pool_per_tier  highest range first, then by rank (so a customer holding entries in two
 *                 ranges is settled in the top range first and can win only once)
 */
export function orderPrizesForDraw(prizeTiers, prizeMode = 'shared') {
  const byRank = [...prizeTiers].sort((a, b) => a.rank - b.rank);
  if (prizeMode === 'shared') return byRank.map((p) => ({ ...p, tierIndexes: [] }));
  if (prizeMode === 'restricted') return byRank.map((p) => ({ ...p, tierIndexes: p.tierIndexes || [] }));

  const topRange = (p) => Math.max(-1, ...(p.tierIndexes || []));
  return byRank.map((p) => ({ ...p, tierIndexes: p.tierIndexes || [] })).sort((a, b) => topRange(b) - topRange(a) || a.rank - b.rank);
}

/**
 * Picks one winning entry per prize. Each pick is weighted by entriesGranted. A prize with
 * tierIndexes can only be won by entries recorded in one of those ranges; a prize with none is open
 * to everyone. After a customer (phone number) wins, all of their entries leave the pool, so nobody
 * wins two prizes in one draw. A prize nobody is eligible for is skipped (fewer winners than prizes).
 *
 * entries:    [{ _id, customerPhone, entriesGranted, tierIndex? }]
 * prizeTiers: [{ rank, prizeDescription, tierIndexes? }]
 * options.ordered: the prizes are already in draw order (see orderPrizesForDraw); otherwise rank order.
 */
export function selectWinners(entries, prizeTiers, rng = Math.random, { ordered = false } = {}) {
  const tiers = ordered ? [...prizeTiers] : [...prizeTiers].sort((a, b) => a.rank - b.rank);
  let pool = entries.filter((e) => e.entriesGranted > 0);
  const winners = [];

  for (const tier of tiers) {
    const candidates = tier.tierIndexes?.length
      ? pool.filter((e) => tier.tierIndexes.includes(e.tierIndex))
      : pool;
    if (candidates.length === 0) continue;

    const total = candidates.reduce((sum, e) => sum + e.entriesGranted, 0);
    let target = rng() * total;
    let picked = candidates[candidates.length - 1];
    for (const candidate of candidates) {
      target -= candidate.entriesGranted;
      if (target < 0) {
        picked = candidate;
        break;
      }
    }

    winners.push({ rank: tier.rank, prizeDescription: tier.prizeDescription, entry: picked });
    pool = pool.filter((e) => e.customerPhone !== picked.customerPhone);
  }

  return winners;
}
