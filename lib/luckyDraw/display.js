// Labels and date helpers shared by the Lucky Draw screens. Client-safe (no server imports).

// Display names only: the live_online type (revealed live) is shown as "Digital draw" and the
// digital type (Run draw, every winner at once) as "Live online draw". The keys keep their behaviour.
export const DRAW_TYPE_LABEL = {
  physical: 'Physical draw',
  live_online: 'Digital draw',
  digital: 'Live online draw',
};

const NAMED_LEVELS = { 1: 'Grand Prize', 2: 'Second Prize', 3: 'Third Prize' };

/** "4th", "11th", "22nd". */
function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

/** Grand Prize, Second Prize, Third Prize, then 4th Prize, 5th Prize and so on. */
export const prizeLevelLabel = (rank) => NAMED_LEVELS[rank] || `${ordinal(Number(rank))} Prize`;

/** "Bills of ₹1,000 or more get 1 entry" / "Every bill gets 1 entry". */
export function describeMinBill(amount) {
  const value = Number(amount) || 0;
  return value > 0 ? `Bills of ₹${value.toLocaleString('en-IN')} or more get 1 entry` : 'Every bill gets 1 entry';
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const dayTimeFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

export const formatDay = (date) => (date ? dayFormat.format(new Date(date)) : '—');
export const formatDayTime = (date) => (date ? dayTimeFormat.format(new Date(date)) : '—');

/** Whole days from `now` until `date`, rounded up; 0 once it has passed. */
export function daysUntil(date, now = new Date()) {
  const diff = new Date(date).getTime() - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

export const pluralDays = (n) => `${n} day${n === 1 ? '' : 's'}`;

/** The draw's reveal date: the open draw's date, else the campaign's reveal date, else entries close. */
export const revealDateOf = (campaign, openDraw) =>
  openDraw?.drawDate ?? campaign.nextDrawDate ?? campaign.revealDate ?? campaign.endDate;

/**
 * Where a draw is in its life, as the owner thinks about it:
 * draft, scheduled (entries not open yet), open, closed (waiting for the reveal), due, paused, completed.
 * tone picks the pill colour.
 */
export function drawStage(campaign, { now = new Date(), openDraw = null } = {}) {
  const start = new Date(campaign.startDate);
  const close = new Date(campaign.endDate);
  const reveal = new Date(revealDateOf(campaign, openDraw));

  if (campaign.status === 'draft') return { key: 'draft', label: 'Draft', tone: 'draft' };
  if (campaign.revealInProgress) return { key: 'live', label: 'Revealing live', tone: 'live' };
  if (campaign.status === 'ended') return { key: 'completed', label: 'Completed', tone: 'done' };
  if (campaign.status === 'paused') return { key: 'paused', label: 'Paused', tone: 'paused' };
  if (now < start) return { key: 'scheduled', label: 'Scheduled', tone: 'scheduled' };
  if (now <= close) return { key: 'open', label: 'Entries open', tone: 'open' };
  if (now < reveal) return { key: 'closed', label: 'Entries closed', tone: 'scheduled' };
  return { key: 'due', label: campaign.drawType === 'live_online' ? 'Reveal day' : 'Draw day', tone: 'due' };
}

/** Which list filter tab a campaign belongs to. */
export function listGroup(stage) {
  if (stage.key === 'completed') return 'done';
  if (stage.key === 'scheduled' || stage.key === 'draft') return 'scheduled';
  return 'active';
}

/** Short "what happens next" line for the list. */
export function nextStep(campaign, stage, now = new Date()) {
  switch (stage.key) {
    case 'draft':
      return 'Finish setting up';
    case 'scheduled':
      return `Opens ${formatDay(campaign.startDate)}`;
    case 'open':
      return `Entries close ${formatDay(campaign.endDate)}`;
    case 'closed':
      return `${campaign.drawType === 'live_online' ? 'Reveal' : 'Draw'} ${formatDay(revealDateOf(campaign))}`;
    case 'live':
      return 'Continue the live reveal';
    case 'due':
      if (campaign.drawType === 'physical') return 'Pick the winners today';
      return campaign.drawType === 'live_online' ? 'Reveal winners live today' : 'Draw winners today';
    case 'paused':
      return 'Entries paused';
    default:
      return campaign.unclaimedCount
        ? `${campaign.unclaimedCount} prize${campaign.unclaimedCount === 1 ? '' : 's'} not claimed`
        : `Finished ${formatDay(revealDateOf(campaign) || now)}`;
  }
}

/** Position of `now` between start and reveal, 0-100, for the timeline's "Today" marker. */
export function timelinePosition({ start, close, reveal, now = new Date() }) {
  const s = new Date(start).getTime();
  const r = new Date(reveal).getTime();
  const span = Math.max(1, r - s);
  const pct = (value) => Math.min(100, Math.max(0, ((value - s) / span) * 100));
  return { today: pct(now.getTime()), close: pct(new Date(close).getTime()) };
}
