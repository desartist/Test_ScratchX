import { errorFieldId } from '@/lib/luckyDraw/wizardValidation';

/** Scrolls the first field with an error into the middle of the screen and focuses it, like the Scratch campaign form. */
export function focusFirstError(errors, idFor = errorFieldId) {
  const first = Object.keys(errors || {})[0];
  if (!first || typeof document === 'undefined') return;
  const el = document.getElementById(idFor(first));
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}
