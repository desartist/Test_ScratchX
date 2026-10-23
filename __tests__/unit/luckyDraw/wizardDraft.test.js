import { WIZARD_DRAFT_KEY, WIZARD_STEP_COUNT, clearWizardDraft, hasProgress, readWizardDraft, writeWizardDraft } from '@/lib/luckyDraw/wizardDraft';
import { blankLevel, blankWizardForm } from '@/lib/luckyDraw/wizardValidation';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const NOW = new Date('2026-10-15T10:00:00.000Z');
const started = () => ({
  ...blankWizardForm(),
  drawType: 'physical',
  name: 'Diwali Draw',
  grand: { prizeDescription: 'TV', prizeValue: '20,000', imageUrl: '' },
  confirmed: true,
});

describe('hasProgress', () => {
  it('is false for an untouched form and true once anything meaningful is filled in', () => {
    expect(hasProgress(blankWizardForm())).toBe(false);
    expect(hasProgress({ ...blankWizardForm(), startDate: '2026-10-15T10:00' })).toBe(false);
    expect(hasProgress({ ...blankWizardForm(), drawType: 'digital' })).toBe(true);
    expect(hasProgress({ ...blankWizardForm(), name: 'X' })).toBe(true);
    expect(hasProgress({ ...blankWizardForm(), second: { ...blankWizardForm().second, prizeValue: '5' } })).toBe(true);
    expect(hasProgress(null)).toBe(false);
  });
});

describe('write, read and clear', () => {
  it('round-trips the form and step, never keeping the confirmation tick', () => {
    const storage = memoryStorage();
    expect(writeWizardDraft(storage, { form: started(), step: 3 }, NOW)).toBe(true);

    const draft = readWizardDraft(storage);
    expect(draft.step).toBe(3);
    expect(draft.savedAt).toBe(NOW.toISOString());
    expect(draft.form.name).toBe('Diwali Draw');
    expect(draft.form.grand.prizeDescription).toBe('TV');
    expect(draft.form.confirmed).toBe(false);

    clearWizardDraft(storage);
    expect(readWizardDraft(storage)).toBeNull();
  });

  it('fills in fields a saved draft is missing, so an older draft still opens', () => {
    const storage = memoryStorage({ [WIZARD_DRAFT_KEY]: JSON.stringify({ step: 2, savedAt: NOW.toISOString(), form: { drawType: 'digital', name: 'Old', grand: { prizeDescription: 'TV' } } }) });
    const draft = readWizardDraft(storage);
    expect(draft.form.second).toEqual(blankWizardForm().second);
    expect(draft.form.grand).toEqual({ prizeDescription: 'TV', prizeValue: '', imageUrl: '' });
    // The 3rd prize is required now, so a draft from when it was optional gets an empty one.
    expect(draft.form.third).toEqual(blankWizardForm().third);
    expect(draft.form.smaller).toEqual([]);
    expect(draft.form.minBillAmount).toBe('');
  });

  it('keeps smaller prizes, fills their missing fields and drops any beyond the limit', () => {
    const smaller = [{ prizeDescription: 'Mug' }, ...Array.from({ length: 20 }, () => ({ prizeDescription: 'Pen', prizeValue: '50', quantity: '5', imageUrl: '' }))];
    const storage = memoryStorage({ [WIZARD_DRAFT_KEY]: JSON.stringify({ step: 3, form: { ...blankWizardForm(), name: 'Big draw', smaller } }) });
    const draft = readWizardDraft(storage);
    expect(draft.form.smaller).toHaveLength(17);
    expect(draft.form.smaller[0]).toEqual({ prizeDescription: 'Mug', prizeValue: '', quantity: '1', imageUrl: '' });
  });

  it('counts an added smaller prize as progress worth keeping', () => {
    expect(hasProgress({ ...blankWizardForm(), smaller: [blankLevel(true)] })).toBe(true);
  });

  it('opens a draft from the old four-step wizard at the matching step', () => {
    const old = (step) => readWizardDraft(memoryStorage({ [WIZARD_DRAFT_KEY]: JSON.stringify({ step, form: started() }) })).step;
    expect([1, 2, 3, 4].map(old)).toEqual([1, 1, 2, 3]);
    expect(WIZARD_STEP_COUNT).toBe(3);
  });

  it('ignores broken or empty drafts', () => {
    expect(readWizardDraft(memoryStorage({ [WIZARD_DRAFT_KEY]: 'not json' }))).toBeNull();
    expect(readWizardDraft(memoryStorage({ [WIZARD_DRAFT_KEY]: JSON.stringify({ step: 9, form: started() }) }))).toBeNull();
    expect(readWizardDraft(memoryStorage({ [WIZARD_DRAFT_KEY]: JSON.stringify({ step: 2, form: blankWizardForm() }) }))).toBeNull();
    expect(readWizardDraft(null)).toBeNull();
  });

  it('drops the pictures and tries again when storage is full, and never throws', () => {
    const storage = memoryStorage();
    let calls = 0;
    storage.setItem = (key, value) => {
      calls += 1;
      if (value.includes('data:image')) throw new Error('QuotaExceededError');
      storage.data[key] = value;
    };
    const form = { ...started(), grand: { ...started().grand, imageUrl: 'data:image/jpeg;base64,AAAA' } };
    expect(writeWizardDraft(storage, { form, step: 3 }, NOW)).toBe(true);
    expect(calls).toBe(2);
    expect(readWizardDraft(storage).form.grand.imageUrl).toBe('');

    const broken = { getItem: () => null, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
    expect(writeWizardDraft(broken, { form, step: 3 }, NOW)).toBe(false);
    expect(() => clearWizardDraft(broken)).not.toThrow();
  });
});
