const IST_OFFSET_MS = 330 * 60 * 1000;

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

/** fetch wrapper for the { success, data, error } envelope. Throws Error(message) with .status. */
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON error page: fall through to the generic message.
  }

  if (!res.ok || !json?.success) {
    const error = new Error(json?.error || 'Something went wrong. Please try again.');
    error.status = res.status;
    throw error;
  }
  return json.data;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return dateTimeFormat.format(new Date(value));
}

/** Instant -> "YYYY-MM-DDTHH:mm" in IST, for <input type="datetime-local">. */
export function toISTInputValue(date) {
  return new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" typed as IST -> UTC ISO string, or null if empty/invalid. */
export function istInputToIso(value) {
  if (!value) return null;
  const date = new Date(`${value}:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/** "₹500 to under ₹10,000" / "₹10,000 and above". */
export function describeRange({ minAmount, maxAmount }) {
  return maxAmount == null
    ? `${formatRupees(minAmount)} and above`
    : `${formatRupees(minAmount)} to under ${formatRupees(maxAmount)}`;
}

/** "1 entry" / "5 entries". */
export function pluralEntries(count) {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

export function describeTier(tier) {
  return `${describeRange(tier)}: ${pluralEntries(tier.entriesGranted)}`;
}

/** Which bills a prize is open to, or '' when it is open to everyone. */
export function describePrizeScope(tierIndexes, tiers) {
  const ranges = (tierIndexes || []).map((index) => tiers[index]).filter(Boolean);
  if (ranges.length === 0) return '';
  return `For bills of ${ranges.map(describeRange).join(' or ')}`;
}
