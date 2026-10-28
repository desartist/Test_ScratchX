import LuckyDrawCampaign from '@/models/luckyDrawCampaignModel';
import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireObjectId } from '@/lib/luckyDraw/ids';
import { sendSms, sendEmail, messages } from './notifier';

const TARGETS = ['entries_close', 'reveal'];
const SMS_BATCH_SIZE = 20;
const MAX_REASON_LENGTH = 300;

/** Texts everyone who entered, and emails those who gave an email. Counts are SMS (one per number). */
async function textEntrants(drawId, text, email) {
  const phones = await LuckyDrawEntry.distinct('customerPhone', { drawId });
  let notified = 0;
  for (let i = 0; i < phones.length; i += SMS_BATCH_SIZE) {
    const results = await Promise.allSettled(phones.slice(i, i + SMS_BATCH_SIZE).map((phone) => sendSms(phone, text)));
    notified += results.filter((r) => r.status === 'fulfilled').length;
  }
  const emails = (await LuckyDrawEntry.distinct('customerEmail', { drawId })).filter(Boolean);
  for (let i = 0; i < emails.length; i += SMS_BATCH_SIZE) {
    await Promise.allSettled(emails.slice(i, i + SMS_BATCH_SIZE).map((to) => sendEmail(to, email.template, email.data)));
  }
  return { entrantCount: phones.length, notifiedCount: notified };
}

/**
 * The store owner gives customers more time. Dates only ever move later:
 *  entries_close  entries close later; if that would be after the reveal, the reveal moves too,
 *                 keeping the same gap (winners can only be revealed after entries close)
 *  reveal         winners are revealed later
 * Each change is appended to the open draw's dateHistory. Entrants can be told by SMS.
 */
export async function extendDates(
  campaignId,
  { merchantId, target, newDate, reason = '', notifyEntrants = false, now = new Date() },
) {
  if (!TARGETS.includes(target)) throw new ValidationError('Choose which date to extend: entries close or the reveal');
  const parsed = newDate == null || newDate === '' ? null : new Date(newDate);
  if (!parsed || Number.isNaN(parsed.getTime())) throw new ValidationError('Enter a valid date');
  const note = String(reason || '').trim();
  if (note.length > MAX_REASON_LENGTH) throw new ValidationError(`The reason can be at most ${MAX_REASON_LENGTH} characters`);

  requireObjectId(campaignId, 'Lucky Draw not found');
  const campaign = await LuckyDrawCampaign.findOne({ _id: campaignId, merchantId }).lean();
  if (!campaign) throw new NotFoundError('Lucky Draw not found');
  if (campaign.status === 'ended') throw new ConflictError('This Lucky Draw has finished, so its dates can no longer change');

  const draw = await LuckyDraw.findOne({ campaignId: campaign._id, status: 'scheduled' }).lean();
  if (!draw && campaign.status !== 'draft') {
    throw new ConflictError('The draw has already run, so its dates can no longer change');
  }
  if (draw?.reveal?.startedAt) throw new ConflictError('The reveal has started, so its dates can no longer change');

  const close = new Date(campaign.endDate);
  const reveal = draw ? new Date(draw.drawDate) : new Date(campaign.revealDate || campaign.endDate);

  const campaignSet = {};
  const history = [];
  let newReveal = reveal;
  let revealMoved = false;

  if (target === 'entries_close') {
    if (close <= now) throw new ConflictError('Entries have already closed. You can still move the reveal date.');
    if (parsed <= close) throw new ValidationError('Pick a date later than when entries close now');
    campaignSet.endDate = parsed;
    history.push({ kind: 'entries_close', previousDate: close, newDate: parsed });
    if (parsed > reveal) {
      newReveal = new Date(parsed.getTime() + Math.max(0, reveal.getTime() - close.getTime()));
      revealMoved = true;
    }
  } else {
    if (parsed <= reveal) throw new ValidationError('Pick a date later than the current reveal date');
    if (parsed <= now) throw new ValidationError('The reveal date must be in the future');
    newReveal = parsed;
    revealMoved = true;
  }

  if (revealMoved) {
    history.push({ kind: 'reveal', previousDate: reveal, newDate: newReveal });
    campaignSet.revealDate = newReveal;
  }

  // Matching on the dates we read makes a stale edit fail instead of silently overwriting.
  const updatedCampaign = await LuckyDrawCampaign.findOneAndUpdate(
    { _id: campaign._id, endDate: campaign.endDate, status: campaign.status },
    { $set: campaignSet },
    { new: true },
  ).lean();
  if (!updatedCampaign) throw new ConflictError('The draw changed while you were editing. Refresh and try again.');

  let updatedDraw = null;
  if (draw) {
    const stamp = { changedByAccountId: merchantId, changedAt: now, reason: note };
    updatedDraw = await LuckyDraw.findOneAndUpdate(
      { _id: draw._id, status: 'scheduled', drawDate: draw.drawDate },
      {
        $set: revealMoved ? { drawDate: newReveal } : {},
        $push: { dateHistory: { $each: history.map((h) => ({ ...h, ...stamp })) } },
      },
      { new: true },
    ).lean();
    if (!updatedDraw) {
      // Put the campaign back so the two records never disagree.
      await LuckyDrawCampaign.updateOne(
        { _id: campaign._id },
        { $set: { endDate: campaign.endDate, revealDate: campaign.revealDate ?? null } },
      );
      throw new ConflictError('The draw changed while you were editing. Refresh and try again.');
    }
  }

  let entrantCount = 0;
  let notifiedCount = 0;
  if (notifyEntrants && updatedDraw) {
    const extended = { campaignName: campaign.name, newCloseDate: parsed, revealDate: updatedDraw.drawDate };
    const moved = { campaignName: campaign.name, previousDate: reveal, newDate: newReveal };
    const text = target === 'entries_close' ? messages.entriesExtended(extended) : messages.dateChanged(moved);
    const email = target === 'entries_close' ? { template: 'luckyDrawEntriesExtended', data: extended } : { template: 'luckyDrawDateChange', data: moved };
    ({ entrantCount, notifiedCount } = await textEntrants(draw._id, text, email));

    const last = updatedDraw.dateHistory.length - 1;
    await LuckyDraw.updateOne(
      { _id: draw._id },
      {
        $set: {
          [`dateHistory.${last}.entrantsNotified`]: notifiedCount > 0,
          [`dateHistory.${last}.entrantsNotifiedCount`]: notifiedCount,
        },
      },
    );
    updatedDraw = await LuckyDraw.findById(draw._id).lean();
  }

  return { campaign: updatedCampaign, draw: updatedDraw, revealMoved, entrantCount, notifiedCount };
}
