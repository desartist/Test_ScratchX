// Keeps an unfinished "New lucky draw" on this device (localStorage), so a refresh or a closed
// browser does not lose it and the owner can continue where they left off. Client-only data:
// nothing here is sent to the server until the owner saves or publishes.
import { MAX_SMALLER_PRIZES, blankLevel, blankWizardForm } from './wizardValidation';

export const WIZARD_DRAFT_KEY = 'luckyDraw.newDrawDraft.v1';
export const WIZARD_STEP_COUNT = 3;
// Drafts saved before the draw type moved into the details step have no `steps` and count 4 steps:
// draw type and details both open as details, prizes as prizes, review as review.
const OLD_STEP = { 1: 1, 2: 1, 3: 2, 4: 3 };

const levelHasInput = (level) => !!level && !!(level.prizeDescription?.trim() || level.prizeValue?.trim() || level.imageUrl);

/** True once the owner has entered something worth keeping (the default dates alone don't count). */
export function hasProgress(form) {
  if (!form) return false;
  return !!(
    form.drawType ||
    form.name?.trim() ||
    form.description?.trim() ||
    form.minBillAmount?.trim() ||
    levelHasInput(form.grand) ||
    levelHasInput(form.second) ||
    levelHasInput(form.third) ||
    form.smaller?.length > 0
  );
}

/** The saved draft as { form, step, savedAt }, or null when there is none worth offering. */
export function readWizardDraft(storage) {
  try {
    const raw = storage?.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || !saved.form) return null;
    const step = saved.steps === WIZARD_STEP_COUNT ? saved.step : OLD_STEP[saved.step];
    if (!Number.isInteger(step) || step < 1 || step > WIZARD_STEP_COUNT) return null;
    const base = blankWizardForm();
    const form = {
      ...base,
      ...saved.form,
      grand: { ...blankLevel(false), ...(saved.form.grand || {}) },
      second: { ...blankLevel(true), ...(saved.form.second || {}) },
      // Drafts saved while the Third Prize was optional may have none: it is required now.
      third: { ...blankLevel(true), ...(saved.form.third || {}) },
      smaller: (Array.isArray(saved.form.smaller) ? saved.form.smaller : [])
        .slice(0, MAX_SMALLER_PRIZES)
        .map((level) => ({ ...blankLevel(true), ...(level || {}) })),
      // The "I confirm I will hand over the prizes" tick is always asked for again.
      confirmed: false,
    };
    if (!hasProgress(form)) return null;
    return { form, step, savedAt: saved.savedAt || null };
  } catch {
    return null;
  }
}

const withoutPictures = (form) => ({
  ...form,
  grand: form.grand && { ...form.grand, imageUrl: '' },
  second: form.second && { ...form.second, imageUrl: '' },
  third: form.third && { ...form.third, imageUrl: '' },
  smaller: (form.smaller || []).map((level) => ({ ...level, imageUrl: '' })),
});

/** Saves the draft; if storage is full it retries without the prize pictures. Never throws. */
export function writeWizardDraft(storage, { form, step }, now = new Date()) {
  if (!storage) return false;
  const save = (f) => storage.setItem(WIZARD_DRAFT_KEY, JSON.stringify({ form: { ...f, confirmed: false }, step, steps: WIZARD_STEP_COUNT, savedAt: now.toISOString() }));
  try {
    save(form);
    return true;
  } catch {
    try {
      save(withoutPictures(form));
      return true;
    } catch {
      return false;
    }
  }
}

export function clearWizardDraft(storage) {
  try {
    storage?.removeItem(WIZARD_DRAFT_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): nothing to clear.
  }
}
