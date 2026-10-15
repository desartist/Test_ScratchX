import { WIZARD_DRAFT_KEY, clearWizardDraft, hasProgress, readWizardDraft, writeWizardDraft } from '@/lib/luckyDraw/wizardDraft';
import { blankWizardForm } from '@/lib/luckyDraw/wizardValidation';

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
    expect(draft.form.third).toBeNull();
    expect(draft.form.minBillAmount).toBe('');
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
