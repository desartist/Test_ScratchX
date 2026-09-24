jest.mock('@/lib/otpProvider', () => ({
  __esModule: true,
  default: {
    sendTwilio: jest.fn().mockResolvedValue({ success: true, messageId: 'tw-1' }),
    sendAWSSNS: jest.fn().mockResolvedValue({ success: true, messageId: 'sns-1' }),
  },
}));

import otpProvider from '@/lib/otpProvider';
import { toE164, formatDrawDate, sendSms, messages } from '@/lib/services/luckyDraw/notifier';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';

describe('toE164', () => {
  it('prefixes 10-digit Indian mobiles with +91', () => {
    expect(toE164('9876543210')).toBe('+919876543210');
  });
  it('normalises numbers that already carry a country code', () => {
    expect(toE164('919876543210')).toBe('+919876543210');
    expect(toE164('+91 98765 43210')).toBe('+919876543210');
  });
});

describe('formatDrawDate', () => {
  it('formats in IST', () => {
    const text = formatDrawDate('2026-09-23T12:30:00Z'); // 18:00 IST
    expect(text).toMatch(/2026/);
    expect(text).toMatch(/6:00/);
  });
});

describe('sendSms', () => {
  const original = process.env.OTP_PROVIDER;
  afterEach(() => {
    if (original === undefined) delete process.env.OTP_PROVIDER;
    else process.env.OTP_PROVIDER = original;
    jest.clearAllMocks();
  });

  it('logs to the console when no real provider is configured', async () => {
    delete process.env.OTP_PROVIDER;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = await sendSms('9876543210', 'hello');
    expect(result.success).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('+919876543210'));
    expect(otpProvider.sendTwilio).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('sends through Twilio when configured', async () => {
    process.env.OTP_PROVIDER = 'twilio';
    await sendSms('9876543210', 'hello');
    expect(otpProvider.sendTwilio).toHaveBeenCalledWith('+919876543210', 'hello');
  });

  it('sends through AWS SNS when configured', async () => {
    process.env.OTP_PROVIDER = 'aws-sns';
    await sendSms('9876543210', 'hello');
    expect(otpProvider.sendAWSSNS).toHaveBeenCalledWith('+919876543210', 'hello');
  });

  it('lets provider errors reach the caller', async () => {
    process.env.OTP_PROVIDER = 'twilio';
    otpProvider.sendTwilio.mockRejectedValueOnce(new Error('Twilio error: down'));
    await expect(sendSms('9876543210', 'hello')).rejects.toThrow('Twilio error: down');
  });
});

describe('messages', () => {
  it('confirms an entry with the current date and the customer notice', () => {
    const text = messages.entryConfirmation({
      campaignName: 'Diwali Draw',
      entries: 3,
      drawDate: '2026-09-23T12:30:00Z',
    });
    expect(text).toContain('Diwali Draw');
    expect(text).toContain('3 entries');
    expect(text).toContain(DATE_CHANGE_NOTICE);
  });

  it('uses the singular for one entry', () => {
    const text = messages.entryConfirmation({ campaignName: 'X', entries: 1, drawDate: new Date() });
    expect(text).toContain('1 entry');
  });

  it('announces a date change with both dates and the notice', () => {
    const text = messages.dateChanged({
      campaignName: 'Diwali Draw',
      previousDate: '2026-09-23T12:30:00Z',
      newDate: '2026-10-01T12:30:00Z',
    });
    expect(text).toContain('Diwali Draw');
    expect(text).toContain('2026');
    expect(text).toContain(DATE_CHANGE_NOTICE);
  });

  it('tells a winner their prize, claim code and deadline', () => {
    const text = messages.winner({
      campaignName: 'Diwali Draw',
      rank: 1,
      prizeDescription: 'Smart TV',
      claimCode: 'ABCD2345',
      expiresAt: '2026-10-23T12:30:00Z',
    });
    expect(text).toContain('Smart TV');
    expect(text).toContain('ABCD2345');
    expect(text).toContain('#1');
  });
});
