import LuckyDraw from '@/models/luckyDrawModel';
import LuckyDrawEntry from '@/models/luckyDrawEntryModel';
import { ConflictError, ValidationError } from '@/lib/errors';
import { assertDrawOwner } from './openDraw';
import { sendSms, messages } from './notifier';

const SMS_BATCH_SIZE = 20;
const MAX_REASON_LENGTH = 300;

/**
 * The store owner moves a draw's date (earlier or later, any number of
 * times) until the draw runs. Every change is appended to dateHistory.
 */
export async function changeDrawDate(
  drawId,
  { merchantId, newDate, reason = '', notifyEntrants = false, now = new Date() },
) {
  const parsed = newDate == null || newDate === '' ? null : new Date(newDate);
  if (!parsed || Number.isNaN(parsed.getTime())) throw new ValidationError('Enter a valid draw date');
  if (parsed <= now) throw new ValidationError('The draw date must be in the future');

  const note = String(reason || '').trim();
  if (note.length > MAX_REASON_LENGTH) {
    throw new ValidationError(`The reason can be at most ${MAX_REASON_LENGTH} characters`);
  }

  const { draw, campaign } = await assertDrawOwner(drawId, merchantId);
  if (draw.status !== 'scheduled') throw new ConflictError('The draw date can only change before the draw runs');
  if (parsed.getTime() === new Date(draw.drawDate).getTime()) {
    throw new ValidationError('That is already the draw date');
  }

  // Matching on the current drawDate makes a stale edit fail instead of silently overwriting.
  const updated = await LuckyDraw.findOneAndUpdate(
    { _id: draw._id, status: 'scheduled', drawDate: draw.drawDate },
    {
      $set: { drawDate: parsed },
      $push: {
        dateHistory: {
          previousDate: draw.drawDate,
          newDate: parsed,
          changedByAccountId: merchantId,
          changedAt: now,
          reason: note,
        },
      },
    },
    { new: true },
  );
  if (!updated) throw new ConflictError('The draw changed while you were editing. Refresh and try again.');

  let entrantCount = 0;
  let notifiedCount = 0;
  if (notifyEntrants) {
    const phones = await LuckyDrawEntry.distinct('customerPhone', { drawId: draw._id });
    entrantCount = phones.length;
    const text = messages.dateChanged({
      campaignName: campaign.name,
      previousDate: draw.drawDate,
      newDate: parsed,
    });

    for (let i = 0; i < phones.length; i += SMS_BATCH_SIZE) {
      const results = await Promise.allSettled(phones.slice(i, i + SMS_BATCH_SIZE).map((phone) => sendSms(phone, text)));
      notifiedCount += results.filter((r) => r.status === 'fulfilled').length;
    }

    const index = updated.dateHistory.length - 1;
    await LuckyDraw.updateOne(
      { _id: draw._id },
      {
        $set: {
          [`dateHistory.${index}.entrantsNotified`]: notifiedCount > 0,
          [`dateHistory.${index}.entrantsNotifiedCount`]: notifiedCount,
        },
      },
    );
  }

  const finalDraw = await LuckyDraw.findById(draw._id).lean();
  return { draw: finalDraw, entrantCount, notifiedCount };
}
