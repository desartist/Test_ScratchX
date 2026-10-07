// Labels and date helpers shared by the Lucky Draw screens. Client-safe (no server imports).

/** sessionStorage key the calculator uses to hand its prizes to the create form. */
export const CALCULATOR_STORAGE_KEY = 'luckyDraw.calculatorPrizes';

export const MODE_LABEL = {
  online: 'Online',
  manual_online_reveal: 'Manual, online reveal',
  manual_offline_reveal: 'Manual, in-store reveal',
};

export const MODE_DESCRIPTION = {
  online: 'Customers enter on their phone by scanning your QR code with their bill. ScratchX picks the winners.',
  manual_online_reveal:
    'You hand out numbered entry slips at the counter. On the reveal date ScratchX picks the winning slips and you reveal them live online.',
  manual_offline_reveal:
    'You hand out numbered entry slips at the counter. On the reveal date you draw slips in your store and type in the winning numbers.',
};

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
export const formatSlipNumber = (n) => String(n).padStart(4, '0');

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
  if (campaign.status === 'ended') return { key: 'completed', label: 'Completed', tone: 'done' };
  if (campaign.status === 'paused') return { key: 'paused', label: 'Paused', tone: 'paused' };
  if (now < start) return { key: 'scheduled', label: 'Scheduled', tone: 'scheduled' };
  if (now <= close) return { key: 'open', label: 'Entries open', tone: 'open' };
  if (now < reveal) return { key: 'closed', label: 'Entries closed', tone: 'scheduled' };
  return { key: 'due', label: 'Reveal day', tone: 'due' };
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
      return `Reveal ${formatDay(revealDateOf(campaign))}`;
    case 'due':
      return campaign.distributionMode === 'manual_offline_reveal' ? 'Record winners today' : 'Reveal winners today';
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
