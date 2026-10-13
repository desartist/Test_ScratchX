import {
  api,
  formatDateTime,
  toISTInputValue,
  istInputToIso,
  formatRupees,
  pluralEntries,
} from '@/lib/luckyDraw/clientApi';

describe('IST date input helpers', () => {
  it('converts an instant to the IST wall-clock value a datetime-local input expects', () => {
    expect(toISTInputValue('2026-09-23T12:30:00Z')).toBe('2026-09-23T18:00');
    expect(toISTInputValue(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01T01:30');
  });

  it('converts an IST input value back to a UTC ISO string', () => {
    expect(istInputToIso('2026-09-23T18:00')).toBe('2026-09-23T12:30:00.000Z');
  });

  it('round-trips', () => {
    const iso = '2026-10-05T12:30:00.000Z';
    expect(istInputToIso(toISTInputValue(iso))).toBe(iso);
  });

  it('returns null for empty or invalid input', () => {
    expect(istInputToIso('')).toBeNull();
    expect(istInputToIso(undefined)).toBeNull();
    expect(istInputToIso('garbage')).toBeNull();
  });
});

describe('formatting', () => {
  it('formats dates in IST and shows a dash for none', () => {
    expect(formatDateTime('2026-09-23T12:30:00Z')).toMatch(/6:00/);
    expect(formatDateTime(null)).toBe('—');
  });

  it('formats rupees with Indian grouping', () => {
    expect(formatRupees(1000)).toBe('₹1,000');
    expect(formatRupees(100000)).toBe('₹1,00,000');
  });
});

describe('api', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });
  const respond = (ok, status, body, jsonThrows = false) => ({
    ok,
    status,
    json: jsonThrows ? () => Promise.reject(new Error('not json')) : () => Promise.resolve(body),
  });

  it('returns data on success and sends JSON bodies', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond(true, 200, { success: true, data: { id: 1 } }));
    expect(await api('/x', { method: 'POST', body: { a: 1 } })).toEqual({ id: 1 });
    expect(global.fetch).toHaveBeenCalledWith('/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });
  });

  it('throws the server message with the status', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond(false, 409, { success: false, error: 'Already ran' }));
    await expect(api('/x')).rejects.toMatchObject({ message: 'Already ran', status: 409 });
  });

  it('falls back to a generic message when the response is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond(false, 502, null, true));
    await expect(api('/x')).rejects.toMatchObject({ message: 'Something went wrong. Please try again.', status: 502 });
  });
});

describe('entry wording', () => {
  it('uses singular and plural for entries', () => {
    expect(pluralEntries(1)).toBe('1 entry');
    expect(pluralEntries(5)).toBe('5 entries');
  });
});
