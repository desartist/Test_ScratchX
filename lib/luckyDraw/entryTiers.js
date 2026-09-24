/**
 * Entry tiers map a bill amount to a number of draw entries.
 * Ranges are half-open: minAmount inclusive, maxAmount exclusive.
 * A null maxAmount means "no upper limit" and is only allowed on the last tier.
 */

export function validateEntryTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return 'At least one entry tier is required';
  }

  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount);

  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    if (!(tier.minAmount >= 0)) return 'Tier minimum must be 0 or more';
    if (!Number.isInteger(tier.entriesGranted) || tier.entriesGranted < 1) {
      return 'Entries per tier must be a whole number of at least 1';
    }
    if (tier.maxAmount != null && !(tier.maxAmount > tier.minAmount)) {
      return 'Tier maximum must be greater than its minimum';
    }
    const next = sorted[i + 1];
    if (next) {
      if (tier.maxAmount == null) return 'Only the last tier can have no maximum';
      if (next.minAmount < tier.maxAmount) return 'Entry tiers must not overlap';
    }
  }

  return null;
}

/**
 * The range a bill falls in: { index, entriesGranted }, or null when it does not qualify.
 * `index` is the range's position in the list (campaigns store ranges sorted by minAmount).
 */
export function resolveTier(tiers, billAmount) {
  if (typeof billAmount !== 'number' || !Number.isFinite(billAmount) || billAmount < 0) {
    return null;
  }
  const list = tiers || [];
  const index = list.findIndex(
    (t) => billAmount >= t.minAmount && (t.maxAmount == null || billAmount < t.maxAmount),
  );
  return index === -1 ? null : { index, entriesGranted: list[index].entriesGranted };
}

/** Returns the number of entries a bill earns; 0 means it does not qualify. */
export function resolveEntries(tiers, billAmount) {
  return resolveTier(tiers, billAmount)?.entriesGranted ?? 0;
}
