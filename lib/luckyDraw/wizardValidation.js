// Rules for the create wizard. Pure and client-safe; the API repeats the same checks (campaignService).
import { DRAW_TYPES, MAX_PRIZE_CATEGORIES, MAX_TOTAL_WINNERS, REQUIRED_PRIZE_LEVELS } from './constants';
import { istInputToIso } from './clientApi';
import { parseAmount } from './calculator';
import { storeProblem } from './storeRules';
import { prizeLevelLabel } from './display';

export const blankLevel = (withQuantity) =>
  withQuantity
    ? { prizeDescription: '', prizeValue: '', quantity: '1', imageUrl: '' }
    : { prizeDescription: '', prizeValue: '', imageUrl: '' };

export function blankWizardForm() {
  return {
    drawType: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    revealDate: '',
    minBillAmount: '',
    grand: blankLevel(false),
    second: blankLevel(true),
    third: blankLevel(true),
    // Optional smaller prizes after the Third Prize: index 0 is the 4th Prize, index 1 the 5th, and so on.
    smaller: [],
    confirmed: false,
  };
}

/** Id of the element that shows a field's error: 'second.quantity' -> 'ld-second-quantity'. */
export const errorFieldId = (key) => `ld-${key.replace(/\./g, '-')}`;

/** How many smaller prizes (4th, 5th, …) can be added on top of the three required levels. */
export const MAX_SMALLER_PRIZES = MAX_PRIZE_CATEGORIES - REQUIRED_PRIZE_LEVELS;

/** Form key of a smaller prize, by its position: 0 -> 'p4' (rank 4). Also the prefix of its error keys. */
export const smallerKey = (index) => `p${index + REQUIRED_PRIZE_LEVELS + 1}`;

/** Position in form.smaller of a smaller prize's key ('p4' -> 0), or -1 for grand/second/third. */
export function smallerIndex(key) {
  const match = /^p(\d+)$/.exec(key);
  return match ? Number(match[1]) - REQUIRED_PRIZE_LEVELS - 1 : -1;
}

const WHOLE_RUPEES = /^[\d,]+$/;
const WHOLE_NUMBER = /^\d+$/;

function detailsErrors(form, { stores, now }) {
  const errors = {};
  if (!DRAW_TYPES.includes(form.drawType)) errors.drawType = 'Choose a draw type.';
  const name = form.name.trim();
  if (!name) errors.name = 'Enter a name for the draw.';
  else if (name.length < 3) errors.name = 'Use at least 3 characters.';

  const start = istInputToIso(form.startDate);
  const end = istInputToIso(form.endDate);
  const reveal = istInputToIso(form.revealDate);
  if (!start) errors.startDate = 'Pick when entries open.';
  if (!end) errors.endDate = 'Pick when entries close.';
  else if (start && new Date(end) <= new Date(start)) errors.endDate = 'Entries must close after they open.';
  else if (new Date(end) <= now) errors.endDate = 'Pick a time in the future.';
  if (!reveal) errors.revealDate = 'Pick the draw date.';
  else if (end && new Date(reveal) < new Date(end)) errors.revealDate = 'The draw date must be on or after entries close.';

  const amount = String(form.minBillAmount ?? '').trim();
  if (!amount) errors.minBillAmount = 'Enter the minimum bill amount.';
  else if (!WHOLE_RUPEES.test(amount)) errors.minBillAmount = 'Enter a whole number of rupees, like 1000.';

  const storeIssue = storeProblem(form.drawType, stores);
  if (storeIssue) errors.stores = storeIssue;
  return errors;
}

function levelErrors(errors, key, level, label) {
  if (!level.prizeDescription.trim()) errors[`${key}.prizeDescription`] = `Name the ${label}.`;
  const quantity = String(level.quantity ?? '').trim();
  if (!WHOLE_NUMBER.test(quantity) || Number(quantity) < 1) {
    errors[`${key}.quantity`] = `Enter how many people win the ${label} (1 or more).`;
  }
  const prizeValueText = String(level.prizeValue ?? '').trim();
  if (parseAmount(level.prizeValue) <= 0) errors[`${key}.prizeValue`] = `Enter what each ${label} is worth.`;
  else if (!WHOLE_RUPEES.test(prizeValueText)) errors[`${key}.prizeValue`] = 'Enter a whole number of rupees, like 5000.';
}

function prizeErrors(form) {
  const errors = {};
  if (!form.grand.prizeDescription.trim()) errors['grand.prizeDescription'] = 'Name the Grand Prize.';
  const grandValueText = String(form.grand.prizeValue ?? '').trim();
  if (parseAmount(form.grand.prizeValue) <= 0) errors['grand.prizeValue'] = 'Enter what the Grand Prize is worth.';
  else if (!WHOLE_RUPEES.test(grandValueText)) errors['grand.prizeValue'] = 'Enter a whole number of rupees, like 5000.';
  levelErrors(errors, 'second', form.second, prizeLevelLabel(2));
  levelErrors(errors, 'third', form.third, prizeLevelLabel(3));
  const smaller = form.smaller || [];
  smaller.forEach((level, i) => levelErrors(errors, smallerKey(i), level, prizeLevelLabel(i + REQUIRED_PRIZE_LEVELS + 1)));

  const winners =
    1 + parseAmount(form.second.quantity) + parseAmount(form.third.quantity) + smaller.reduce((sum, l) => sum + parseAmount(l.quantity), 0);
  if (Object.keys(errors).length === 0 && winners > MAX_TOTAL_WINNERS) {
    errors['second.quantity'] = `A draw can have at most ${MAX_TOTAL_WINNERS.toLocaleString('en-IN')} winners.`;
  }
  return errors;
}

/** Every problem on one step, keyed by field, in the order the fields appear on the page. */
/** Steps: 1 details and entry (with the draw type), 2 prizes, 3 review. */
export function stepErrors(step, form, { stores = [], now = new Date() } = {}) {
  switch (step) {
    case 1:
      return detailsErrors(form, { stores, now });
    case 2:
      return prizeErrors(form);
    case 3:
      return form.confirmed ? {} : { confirmed: 'Tick this box to confirm you will hand over the prizes.' };
    default:
      return {};
  }
}

const levelBody = (level, rank) => ({
  rank,
  prizeDescription: level.prizeDescription.trim(),
  prizeValue: parseAmount(level.prizeValue),
  quantity: rank === 1 ? 1 : parseAmount(level.quantity),
  imageUrl: level.imageUrl || null,
});

/** What POST /api/lucky-draws/campaigns expects. */
export function buildCampaignBody(form) {
  const prizes = [
    levelBody(form.grand, 1),
    levelBody(form.second, 2),
    levelBody(form.third, 3),
    ...(form.smaller || []).map((level, i) => levelBody(level, i + REQUIRED_PRIZE_LEVELS + 1)),
  ];
  return {
    drawType: form.drawType,
    name: form.name.trim(),
    description: form.description.trim(),
    startDate: istInputToIso(form.startDate),
    endDate: istInputToIso(form.endDate),
    revealDate: istInputToIso(form.revealDate),
    minBillAmount: parseAmount(form.minBillAmount),
    prizes,
  };
}
