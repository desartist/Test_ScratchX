/**
 * Login cookies: closing the browser / coming back from a link or shortcut
 * must not look logged-out. Production used sameSite 'strict' (cookies
 * dropped on arrival from another site/app) and Google sign-in never set the
 * sessionId cookie the middleware verifies authToken against.
 */
const { createHmac } = require('crypto');
const { NextRequest } = require('next/server');

const mockJar = new Map();
jest.mock('next/headers', () => ({
  cookies: async () => ({ set: (name, value, opts) => mockJar.set(name, { value, opts }) }),
}));

process.env.COOKIE_SECRET = 'test-secret';
const { setAuthSession } = require('@/lib/setAuthSession');
const { authCookieOptions, AUTH_COOKIE_MAX_AGE } = require('@/lib/authCookieOptions');
const { middleware } = require('@/middleware');

const ACCOUNT = { _id: 'acc1', role: 'Merchant' };
const SESSION = { _id: '6a1111111111111111111111' };

beforeEach(() => mockJar.clear());

test('login cookies are lax, 7-day, persistent (survive closing the browser) — in production too', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await setAuthSession(ACCOUNT, SESSION);
  } finally {
    process.env.NODE_ENV = prev;
  }
  for (const name of ['authToken', 'sessionId', 'accountRole']) {
    const c = mockJar.get(name);
    expect(c).toBeDefined();
    expect(c.opts).toMatchObject({ sameSite: 'lax', maxAge: AUTH_COOKIE_MAX_AGE, path: '/', secure: true });
  }
  expect(mockJar.get('authToken').opts.httpOnly).toBe(true);
  expect(mockJar.get('accountRole').opts.httpOnly).toBe(false);
  expect(AUTH_COOKIE_MAX_AGE).toBe(7 * 24 * 60 * 60);
});

test('the cookies login sets get the user past the middleware to /dashboard', async () => {
  await setAuthSession(ACCOUNT, SESSION);
  const cookie = [...mockJar].map(([k, v]) => `${k}=${v.value}`).join('; ');
  const res = await middleware(new NextRequest('https://test.thescratchx.com/dashboard', { headers: { cookie } }));
  expect(res.headers.get('location') || '').not.toContain('/auth/login');
});

test('authToken WITHOUT sessionId (the old Google sign-in) is treated as logged out', async () => {
  const token = createHmac('sha256', 'test-secret').update(SESSION._id).digest('hex');
  const res = await middleware(new NextRequest('https://test.thescratchx.com/dashboard', {
    headers: { cookie: `authToken=${token}; accountRole=Merchant` },
  }));
  expect(res.headers.get('location') || '').toContain('/auth/login');
});

test('authCookieOptions defaults', () => {
  expect(authCookieOptions()).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  expect(authCookieOptions({ httpOnly: false }).httpOnly).toBe(false);
});
