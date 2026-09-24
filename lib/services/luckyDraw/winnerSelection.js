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
 * Picks one winning entry per prize, in ascending rank order. Each pick is
 * weighted by entriesGranted. After a customer (phone number) wins, all of
 * their entries leave the pool, so nobody wins two prizes in one draw. If the
 * pool empties early, fewer winners than prizes are returned.
 *
 * entries:    [{ _id, customerPhone, entriesGranted }]
 * prizeTiers: [{ rank, prizeDescription }]
 */
export function selectWinners(entries, prizeTiers, rng = Math.random) {
  const tiers = [...prizeTiers].sort((a, b) => a.rank - b.rank);
  let pool = entries.filter((e) => e.entriesGranted > 0);
  const winners = [];

  for (const tier of tiers) {
    if (pool.length === 0) break;

    const total = pool.reduce((sum, e) => sum + e.entriesGranted, 0);
    let target = rng() * total;
    let picked = pool[pool.length - 1];
    for (const candidate of pool) {
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
