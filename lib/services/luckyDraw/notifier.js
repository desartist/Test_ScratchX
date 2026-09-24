import otpProvider from '@/lib/otpProvider';
import { DATE_CHANGE_NOTICE } from '@/lib/luckyDraw/constants';

/** "9876543210" / "919876543210" / "+91 98765 43210" -> "+919876543210" */
export function toE164(mobile) {
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

const formatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

export function formatDrawDate(date) {
  return formatter.format(new Date(date));
}

export const messages = {
  entryConfirmation: ({ campaignName, entries, drawDate }) =>
    `You're entered in ${campaignName}! ${entries} ${entries === 1 ? 'entry' : 'entries'} added. ` +
    `The draw is currently planned for ${formatDrawDate(drawDate)}. ${DATE_CHANGE_NOTICE}`,

  dateChanged: ({ campaignName, previousDate, newDate }) =>
    `Update for ${campaignName}: the draw date changed from ${formatDrawDate(previousDate)} ` +
    `to ${formatDrawDate(newDate)}. ${DATE_CHANGE_NOTICE}`,

  winner: ({ campaignName, rank, prizeDescription, claimCode, expiresAt }) =>
    `Congratulations! You won prize #${rank} (${prizeDescription}) in ${campaignName}. ` +
    `Show code ${claimCode} at the store before ${formatDrawDate(expiresAt)}.`,
};

/**
 * Sends an SMS through whichever provider OTP_PROVIDER selects (the same
 * setting lib/otpProvider.js uses). Anything other than twilio / aws-sns logs
 * to the console, which is what local development uses. Errors propagate:
 * callers decide whether a failed SMS is fatal (it never is for Lucky Draw).
 */
export async function sendSms(mobile, body) {
  const to = toE164(mobile);

  switch (process.env.OTP_PROVIDER || 'console') {
    case 'twilio':
      return otpProvider.sendTwilio(to, body);
    case 'aws-sns':
      return otpProvider.sendAWSSNS(to, body);
    default:
      console.log(`[LuckyDraw SMS] to ${to}: ${body}`);
      return { success: true, messageId: `console-${Date.now()}` };
  }
}
