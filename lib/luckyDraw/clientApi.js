const IST_OFFSET_MS = 330 * 60 * 1000;

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

export const OFFLINE_MESSAGE = "Couldn't connect. Check your internet and try again.";

/** fetch wrapper for the { success, data, error } envelope. Throws Error(message) with .status. */
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // The browser's own "Failed to fetch" / "Load failed" means no connection, not a server answer.
    const error = new Error(OFFLINE_MESSAGE);
    error.status = 0;
    throw error;
  }

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

/** "1 entry" / "5 entries". */
export function pluralEntries(count) {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}
