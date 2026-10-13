// Rules for the create wizard. Pure and client-safe; the API repeats the same checks (campaignService).
import { DRAW_TYPES, MAX_TOTAL_WINNERS } from './constants';
import { istInputToIso } from './clientApi';
import { parseAmount } from './calculator';
import { storeProblem } from './storeRules';

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
    third: null,
    confirmed: false,
  };
}

/** Id of the element that shows a field's error: 'second.quantity' -> 'ld-second-quantity'. */
export const errorFieldId = (key) => `ld-${key.replace(/\./g, '-')}`;

const WHOLE_RUPEES = /^[\d,]+$/;
const WHOLE_NUMBER = /^\d+$/;
const LEVEL_NAMES = { second: '2nd', third: '3rd' };

function detailsErrors(form, { stores, now }) {
  const errors = {};
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

function levelErrors(errors, key, level) {
  const label = LEVEL_NAMES[key];
  if (!level.prizeDescription.trim()) errors[`${key}.prizeDescription`] = `Name the ${label} prize.`;
  const quantity = String(level.quantity ?? '').trim();
  if (!WHOLE_NUMBER.test(quantity) || Number(quantity) < 1) {
    errors[`${key}.quantity`] = `Enter how many people win the ${label} prize (1 or more).`;
  }
  const prizeValueText = String(level.prizeValue ?? '').trim();
  if (parseAmount(level.prizeValue) <= 0) errors[`${key}.prizeValue`] = `Enter what each ${label} prize is worth.`;
  else if (!WHOLE_RUPEES.test(prizeValueText)) errors[`${key}.prizeValue`] = 'Enter a whole number of rupees, like 5000.';
}

function prizeErrors(form) {
  const errors = {};
  if (!form.grand.prizeDescription.trim()) errors['grand.prizeDescription'] = 'Name the grand prize.';
  const grandValueText = String(form.grand.prizeValue ?? '').trim();
  if (parseAmount(form.grand.prizeValue) <= 0) errors['grand.prizeValue'] = 'Enter what the grand prize is worth.';
  else if (!WHOLE_RUPEES.test(grandValueText)) errors['grand.prizeValue'] = 'Enter a whole number of rupees, like 5000.';
  levelErrors(errors, 'second', form.second);
  if (form.third) levelErrors(errors, 'third', form.third);

  const winners = 1 + parseAmount(form.second.quantity) + (form.third ? parseAmount(form.third.quantity) : 0);
  if (Object.keys(errors).length === 0 && winners > MAX_TOTAL_WINNERS) {
    errors['second.quantity'] = `A draw can have at most ${MAX_TOTAL_WINNERS.toLocaleString('en-IN')} winners.`;
  }
  return errors;
}

/** Every problem on one step, keyed by field, in the order the fields appear on the page. */
export function stepErrors(step, form, { stores = [], now = new Date() } = {}) {
  switch (step) {
    case 1:
      return DRAW_TYPES.includes(form.drawType) ? {} : { drawType: 'Choose how this draw will run.' };
    case 2:
      return detailsErrors(form, { stores, now });
    case 3:
      return prizeErrors(form);
    case 4:
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
  const prizes = [levelBody(form.grand, 1), levelBody(form.second, 2)];
  if (form.third) prizes.push(levelBody(form.third, 3));
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
