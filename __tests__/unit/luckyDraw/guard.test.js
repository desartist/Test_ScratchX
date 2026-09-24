describe('luckyDrawDisabledResponse', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@/lib/featureFlags');
  });

  it('returns a 404 response while the flag is off', async () => {
    jest.doMock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: false }));
    const { luckyDrawDisabledResponse } = require('@/lib/luckyDraw/guard');

    const res = luckyDrawDisabledResponse();

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: 'Not found', data: null });
  });

  it('returns null when the flag is on', () => {
    jest.doMock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: true }));
    const { luckyDrawDisabledResponse } = require('@/lib/luckyDraw/guard');

    expect(luckyDrawDisabledResponse()).toBeNull();
  });

  it('ships disabled', () => {
    const { LUCKY_DRAW_ENABLED } = jest.requireActual('@/lib/featureFlags');
    expect(LUCKY_DRAW_ENABLED).toBe(false);
  });
});
