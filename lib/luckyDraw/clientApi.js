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

export function describeTier({ minAmount, maxAmount, entriesGranted }) {
  const entries = `${entriesGranted} ${entriesGranted === 1 ? 'entry' : 'entries'}`;
  const range =
    maxAmount == null
      ? `${formatRupees(minAmount)} and above`
      : `${formatRupees(minAmount)} to under ${formatRupees(maxAmount)}`;
  return `${range}: ${entries}`;
}
