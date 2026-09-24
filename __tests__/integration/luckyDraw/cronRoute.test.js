jest.mock('@/lib/featureFlags', () => ({ LUCKY_DRAW_ENABLED: true }));
jest.mock('@/lib/connectDB', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/cron/luckyDrawJob', () => ({ runLuckyDrawJob: jest.fn() }));

import { runLuckyDrawJob } from '@/lib/cron/luckyDrawJob';
import { GET } from '@/app/api/cron/lucky-draw/route';

const call = (secret) =>
  GET(new Request('http://localhost/api/cron/lucky-draw', { headers: secret ? { 'X-Cron-Secret': secret } : {} }));

describe('GET /api/cron/lucky-draw', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = 'top-secret';
    runLuckyDrawJob.mockReset();
    runLuckyDrawJob.mockResolvedValue({ ran: 2, failed: 0, notified: 1, expired: 0 });
  });
  afterAll(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('runs the job with the right secret', async () => {
    const res = await call('top-secret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, result: { ran: 2, failed: 0, notified: 1, expired: 0 } });
  });

  it('rejects a missing or wrong secret without running anything', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('nope')).status).toBe(401);
    expect(runLuckyDrawJob).not.toHaveBeenCalled();
  });

  it('reports a server error when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    expect((await call('anything')).status).toBe(500);
    expect(runLuckyDrawJob).not.toHaveBeenCalled();
  });

  it('returns a 500 when the job throws', async () => {
    runLuckyDrawJob.mockRejectedValue(new Error('db down'));
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('top-secret');
    expect(res.status).toBe(500);
    errors.mockRestore();
  });
});
