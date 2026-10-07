import { IST_OFFSET_MINUTES } from '@/lib/luckyDraw/constants';

const MS_PER_MINUTE = 60 * 1000;

/**
 * Next draw time strictly after `after`, computed in fixed IST (UTC+5:30).
 * rule: { frequency: 'daily' | 'weekly', time?: 'HH:mm', dayOfWeek?: 0-6 }
 */
export function nextOccurrence(after, { frequency, time = '18:00', dayOfWeek = null }) {
  const [hours, minutes] = time.split(':').map(Number);
  const shifted = new Date(after.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);

  const candidate = new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      hours,
      minutes,
    ),
  );

  const stepDays = frequency === 'weekly' ? 7 : 1;
  if (frequency === 'weekly') {
    const daysAhead = (dayOfWeek - candidate.getUTCDay() + 7) % 7;
    candidate.setUTCDate(candidate.getUTCDate() + daysAhead);
  }
  while (candidate.getTime() <= shifted.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + stepDays);
  }

  return new Date(candidate.getTime() - IST_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** Draw date for the first draw of a campaign, at activation time. */
export function initialDrawDate(campaign, now) {
  const { scheduleType, recurrence } = campaign.drawConfig;
  const end = new Date(campaign.endDate);
  // One draw when entries close: it runs on the reveal date (older campaigns have none).
  if (scheduleType === 'end_of_campaign') return campaign.revealDate ? new Date(campaign.revealDate) : end;

  const start = new Date(campaign.startDate);
  const from = now > start ? now : start;
  const next = nextOccurrence(from, recurrence);
  return next > end ? end : next;
}

/**
 * Draw date for the draw that follows one that just ran, or null when the
 * campaign has no further draws.
 */
export function nextDrawDateAfterRun(campaign, ranAt) {
  const { scheduleType, recurrence } = campaign.drawConfig;
  if (scheduleType !== 'recurring') return null;

  const end = new Date(campaign.endDate);
  if (ranAt >= end) return null;

  const next = nextOccurrence(ranAt, recurrence);
  return next > end ? end : next;
}
