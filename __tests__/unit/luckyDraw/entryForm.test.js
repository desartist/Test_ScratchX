import { blankEntryForm, blankQrEntryForm, entryBody, entryFieldId, entryFormErrors, isEmail, qrEntryFormErrors, qrFieldId } from '@/lib/luckyDraw/entryForm';

const filled = (o = {}) => ({
  ...blankEntryForm('s1'),
  customerName: 'Ravi Kumar',
  customerMobile: '9811111111',
  customerEmail: 'ravi@example.com',
  billAmount: '1,500',
  consent: true,
  ...o,
});

describe('entryFormErrors', () => {
  it('reports every missing field, in the order they appear', () => {
    const errors = entryFormErrors(blankEntryForm(), { minBillAmount: 0, needsStore: true });
    expect(errors).toEqual({
      customerName: 'Enter the full name.',
      customerMobile: 'Enter the WhatsApp number.',
      customerEmail: 'Enter the email address.',
      billAmount: 'Enter the bill amount.',
      storeId: 'Choose the store this bill is from.',
      consent: 'Confirm the customer agreed to get messages about this draw.',
    });
    expect(Object.keys(errors)).toEqual(['customerName', 'customerMobile', 'customerEmail', 'billAmount', 'storeId', 'consent']);
  });

  it('checks the name, number, email, amount and minimum', () => {
    expect(entryFormErrors(filled({ customerName: 'R', customerMobile: '98111', customerEmail: 'ravi@', billAmount: '12abc' }))).toEqual({
      customerName: 'Use at least 2 characters.',
      customerMobile: 'Enter a 10-digit number.',
      customerEmail: 'Enter an email like name@example.com.',
      billAmount: 'Enter the amount in rupees, like 1500.',
    });
    expect(entryFormErrors(filled({ billAmount: '999' }), { minBillAmount: 1000 })).toEqual({ billAmount: 'Bills of ₹1,000 or more can enter this draw.' });
    expect(entryFormErrors(filled({ billAmount: '1000' }), { minBillAmount: 1000 })).toEqual({});
    expect(entryFormErrors(filled({ billAmount: '1250.50' }), { minBillAmount: 1000 })).toEqual({});
  });

  it('needs a store only when there are several', () => {
    expect(entryFormErrors(filled({ storeId: '' }), { needsStore: false })).toEqual({});
    expect(entryFormErrors(filled({ storeId: '' }), { needsStore: true })).toEqual({ storeId: 'Choose the store this bill is from.' });
  });
});

describe('qrEntryFormErrors', () => {
  it('asks for the full name, WhatsApp number, email and the tick, but never a bill', () => {
    expect(qrEntryFormErrors(blankQrEntryForm())).toEqual({
      customerName: 'Enter the full name.',
      customerMobile: 'Enter the WhatsApp number.',
      customerEmail: 'Enter the email address.',
      consent: 'Tick this box to enter the draw.',
    });
    expect(qrEntryFormErrors({ customerName: 'Rina Kapoor', customerMobile: '9822012345', customerEmail: 'rina@example.com', consent: true })).toEqual({});
    expect(blankQrEntryForm()).not.toHaveProperty('billAmount');
    expect(qrFieldId('customerEmail')).toBe('ld-qr-customerEmail');
  });
});

describe('isEmail', () => {
  it.each([
    ['rina@example.com', true],
    [' Rina.K+draw@shop.co.in ', true],
    ['rina@example', false],
    ['rina example@x.com', false],
    ['@example.com', false],
    [`${'a'.repeat(250)}@x.com`, false],
  ])('%s -> %s', (value, expected) => {
    expect(isEmail(value)).toBe(expected);
  });
});

describe('entryBody and ids', () => {
  it('sends a trimmed email, a numeric bill and leaves out an empty store', () => {
    expect(entryBody(filled({ customerName: ' Ravi Kumar ', customerEmail: ' ravi@example.com ' }))).toEqual({
      customerName: 'Ravi Kumar',
      customerMobile: '9811111111',
      customerEmail: 'ravi@example.com',
      billAmount: 1500,
      consent: true,
      storeId: 's1',
    });
    expect(entryBody(filled({ storeId: '' }))).not.toHaveProperty('storeId');
    expect(entryFieldId('billAmount')).toBe('ld-entry-billAmount');
  });
});
