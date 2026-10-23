import { MAX_SMALLER_PRIZES, blankWizardForm, blankLevel, buildCampaignBody, errorFieldId, smallerIndex, smallerKey, stepErrors } from '@/lib/luckyDraw/wizardValidation';

const NOW = new Date('2026-10-13T06:30:00.000Z'); // 12:00 IST
const located = { _id: 's1', store_name: 'Andheri', latitude: 19.13, longitude: 72.83 };
const unlocated = { _id: 's2', store_name: 'Thane', latitude: null, longitude: null };
const ctx = { stores: [located], now: NOW };

const filled = () => ({
  ...blankWizardForm(),
  drawType: 'physical',
  name: 'Diwali Dhamaka',
  startDate: '2026-10-13T10:00',
  endDate: '2026-11-12T21:00',
  revealDate: '2026-11-14T19:00',
  minBillAmount: '1000',
  grand: { prizeDescription: 'Smart TV', prizeValue: '20,000', imageUrl: '' },
  second: { prizeDescription: 'Gold coin', prizeValue: '5,000', quantity: '2', imageUrl: '' },
  third: { prizeDescription: 'Voucher', prizeValue: '2,000', quantity: '5', imageUrl: '' },
  smaller: [],
  confirmed: true,
});

describe('blank form', () => {
  it('starts with no draw type chosen, an empty 3rd prize and no smaller prizes', () => {
    const form = blankWizardForm();
    expect(form.drawType).toBe('');
    expect(form.third).toEqual(blankLevel(true));
    expect(form.smaller).toEqual([]);
    expect(form.second.quantity).toBe('1');
    expect(blankLevel(false)).not.toHaveProperty('quantity');
  });
});

describe('step 1: details and entry', () => {
  it('needs a draw type, checked first', () => {
    expect(stepErrors(1, { ...filled(), drawType: '' }, ctx)).toEqual({ drawType: 'Choose a draw type.' });
    expect(Object.keys(stepErrors(1, blankWizardForm(), ctx))[0]).toBe('drawType');
    expect(stepErrors(1, filled(), ctx)).toEqual({});
  });

  it('reports every empty field at once, in page order', () => {
    const errors = stepErrors(1, { ...blankWizardForm(), drawType: 'physical' }, ctx);
    expect(Object.keys(errors)).toEqual(['name', 'startDate', 'endDate', 'revealDate', 'minBillAmount']);
    expect(errors).toEqual({
      name: 'Enter a name for the draw.',
      startDate: 'Pick when entries open.',
      endDate: 'Pick when entries close.',
      revealDate: 'Pick the draw date.',
      minBillAmount: 'Enter the minimum bill amount.',
    });
  });

  it('checks name length, date order and the amount format', () => {
    const errors = stepErrors(1, { ...filled(), name: '  ab ', endDate: '2026-10-13T09:00', revealDate: '2026-10-12T09:00', minBillAmount: '99.5' }, ctx);
    expect(errors).toEqual({
      name: 'Use at least 3 characters.',
      endDate: 'Entries must close after they open.',
      revealDate: 'The draw date must be on or after entries close.',
      minBillAmount: 'Enter a whole number of rupees, like 1000.',
    });
  });

  it('wants entries to close in the future', () => {
    const errors = stepErrors(1, { ...filled(), startDate: '2026-10-01T10:00', endDate: '2026-10-12T21:00', revealDate: '2026-10-14T21:00' }, ctx);
    expect(errors).toEqual({ endDate: 'Pick a time in the future.' });
  });

  it('accepts a minimum of 0 and commas', () => {
    expect(stepErrors(1, { ...filled(), minBillAmount: '0' }, ctx)).toEqual({});
    expect(stepErrors(1, { ...filled(), minBillAmount: '1,500' }, ctx)).toEqual({});
  });

  it('checks the stores for the chosen draw type', () => {
    expect(stepErrors(1, filled(), { stores: [], now: NOW })).toEqual({ stores: 'You have no active stores. Add a store first.' });
    expect(stepErrors(1, { ...filled(), drawType: 'digital' }, { stores: [unlocated], now: NOW })).toEqual({
      stores: 'Customers can only scan in at a store with a location. Add a location to one of your stores first.',
    });
    expect(stepErrors(1, filled(), { stores: [unlocated], now: NOW })).toEqual({});
  });
});

describe('step 2: prizes', () => {
  it('needs the grand prize and the 2nd prize filled in', () => {
    const form = { ...filled(), grand: blankLevel(false), second: { ...blankLevel(true), quantity: '' } };
    expect(stepErrors(2, form, ctx)).toEqual({
      'grand.prizeDescription': 'Name the Grand Prize.',
      'grand.prizeValue': 'Enter what the Grand Prize is worth.',
      'second.prizeDescription': 'Name the Second Prize.',
      'second.quantity': 'Enter how many people win the Second Prize (1 or more).',
      'second.prizeValue': 'Enter what each Second Prize is worth.',
    });
  });

  it('needs the 3rd prize filled in', () => {
    expect(stepErrors(2, filled(), ctx)).toEqual({});
    const errors = stepErrors(2, { ...filled(), third: { ...blankLevel(true), quantity: '0' } }, ctx);
    expect(errors).toEqual({
      'third.prizeDescription': 'Name the Third Prize.',
      'third.quantity': 'Enter how many people win the Third Prize (1 or more).',
      'third.prizeValue': 'Enter what each Third Prize is worth.',
    });
  });

  it('checks every smaller prize, named by its place', () => {
    const smaller = [{ prizeDescription: 'Mug', prizeValue: '200', quantity: '10', imageUrl: '' }, blankLevel(true)];
    expect(stepErrors(2, { ...filled(), smaller }, ctx)).toEqual({
      'p5.prizeDescription': 'Name the 5th Prize.',
      'p5.prizeValue': 'Enter what each 5th Prize is worth.',
    });
  });

  it('counts smaller prizes toward the winner cap', () => {
    const smaller = [{ prizeDescription: 'Pen', prizeValue: '50', quantity: '995', imageUrl: '' }];
    expect(stepErrors(2, { ...filled(), smaller }, ctx)).toEqual({ 'second.quantity': 'A draw can have at most 1,000 winners.' });
  });

  it('caps the total number of winners', () => {
    const errors = stepErrors(2, { ...filled(), second: { ...filled().second, quantity: '1000' } }, ctx);
    expect(errors).toEqual({ 'second.quantity': 'A draw can have at most 1,000 winners.' });
  });

  it('rejects a decimal prize value', () => {
    const errors = stepErrors(2, { ...filled(), second: { ...filled().second, prizeValue: '5000.50' } }, ctx);
    expect(errors).toEqual({ 'second.prizeValue': 'Enter a whole number of rupees, like 5000.' });
  });
});

describe('step 3: review', () => {
  it('needs the confirmation ticked', () => {
    expect(stepErrors(3, { ...filled(), confirmed: false }, ctx)).toEqual({ confirmed: 'Tick this box to confirm you will hand over the prizes.' });
    expect(stepErrors(3, filled(), ctx)).toEqual({});
  });
});

describe('errorFieldId', () => {
  it('turns a key into the id of its input', () => {
    expect(errorFieldId('name')).toBe('ld-name');
    expect(errorFieldId('second.quantity')).toBe('ld-second-quantity');
    expect(errorFieldId('p4.prizeValue')).toBe('ld-p4-prizeValue');
  });
});

describe('smaller prize keys', () => {
  it('maps a position to its key and back', () => {
    expect(smallerKey(0)).toBe('p4');
    expect(smallerKey(2)).toBe('p6');
    expect(smallerIndex('p4')).toBe(0);
    expect(smallerIndex('p6')).toBe(2);
    expect(smallerIndex('third')).toBe(-1);
  });

  it('allows up to 20 prize levels in all', () => {
    expect(MAX_SMALLER_PRIZES).toBe(17);
  });
});

describe('buildCampaignBody', () => {
  it('sends IST dates as UTC, amounts as numbers and the prize levels by rank', () => {
    const body = buildCampaignBody({
      ...filled(),
      description: ' Big one ',
      third: { prizeDescription: 'Voucher', prizeValue: '2,000', quantity: '5', imageUrl: 'data:image/jpeg;base64,AAAA' },
      smaller: [
        { prizeDescription: 'Mug', prizeValue: '200', quantity: '10', imageUrl: '' },
        { prizeDescription: 'Pen', prizeValue: '50', quantity: '20', imageUrl: '' },
      ],
    });
    expect(body).toEqual({
      drawType: 'physical',
      name: 'Diwali Dhamaka',
      description: 'Big one',
      startDate: '2026-10-13T04:30:00.000Z',
      endDate: '2026-11-12T15:30:00.000Z',
      revealDate: '2026-11-14T13:30:00.000Z',
      minBillAmount: 1000,
      prizes: [
        { rank: 1, prizeDescription: 'Smart TV', prizeValue: 20000, quantity: 1, imageUrl: null },
        { rank: 2, prizeDescription: 'Gold coin', prizeValue: 5000, quantity: 2, imageUrl: null },
        { rank: 3, prizeDescription: 'Voucher', prizeValue: 2000, quantity: 5, imageUrl: 'data:image/jpeg;base64,AAAA' },
        { rank: 4, prizeDescription: 'Mug', prizeValue: 200, quantity: 10, imageUrl: null },
        { rank: 5, prizeDescription: 'Pen', prizeValue: 50, quantity: 20, imageUrl: null },
      ],
    });
  });
});
