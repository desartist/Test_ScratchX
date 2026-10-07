// With LUCKY_DRAW_ENABLED false, every Lucky Draw route must answer 404
// and touch nothing, so the app behaves exactly as it does without the feature.
const routes = [
  ['app/api/lucky-draws/campaigns/route', ['GET', 'POST']],
  ['app/api/lucky-draws/campaigns/[id]/route', ['GET']],
  ['app/api/lucky-draws/campaigns/[id]/status/route', ['PATCH']],
  ['app/api/lucky-draws/campaigns/[id]/qr/route', ['GET']],
  ['app/api/lucky-draws/draws/[drawId]/run/route', ['POST']],
  ['app/api/lucky-draws/draws/[drawId]/date/route', ['PATCH']],
  ['app/api/lucky-draws/redeem/route', ['POST']],
  ['app/api/customer/lucky-draw/campaigns/[id]/route', ['GET']],
  ['app/api/customer/lucky-draw/participate/route', ['POST']],
  ['app/api/customer/lucky-draw/status/route', ['POST']],
  ['app/api/cron/lucky-draw/route', ['GET']],
];

describe('Lucky Draw routes while the feature flag is off', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: false }));
    jest.doMock('@/lib/connectDB', () => ({ connectDB: jest.fn(() => { throw new Error('must not connect'); }) }));
    jest.doMock('@/lib/auth', () => ({ requireAuth: jest.fn(() => { throw new Error('must not authenticate'); }) }));
  });

  it.each(routes.flatMap(([path, methods]) => methods.map((method) => [path, method])))('%s %s -> 404', async (path, method) => {
    const handler = require(`@/${path}`)[method];
    const res = await handler(new Request('http://localhost/x', { method }), {
      params: Promise.resolve({ id: 'x', drawId: 'x' }),
    });
    expect(res.status).toBe(404);
  });
});
