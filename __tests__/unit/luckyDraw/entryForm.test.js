import { blankEntryForm, entryBody, entryFieldId, entryFormErrors } from '@/lib/luckyDraw/entryForm';

const filled = (o = {}) => ({ ...blankEntryForm('s1'), customerName: 'Ravi Kumar', customerMobile: '9811111111', billAmount: '1,500', consent: true, ...o });

describe('entryFormErrors', () => {
  it('reports every missing field, in the order they appear', () => {
    expect(entryFormErrors(blankEntryForm(), { minBillAmount: 0, needsStore: true })).toEqual({
      customerName: "Enter the customer's name.",
      customerMobile: "Enter the customer's mobile number.",
      billAmount: 'Enter the bill amount.',
      storeId: 'Choose the store this bill is from.',
      consent: 'Confirm the customer agreed to get SMS about this draw.',
    });
  });

  it('checks the name, mobile, amount and minimum', () => {
    expect(entryFormErrors(filled({ customerName: 'R', customerMobile: '98111', billAmount: '12abc' }))).toEqual({
      customerName: 'Use at least 2 characters.',
      customerMobile: 'Enter a 10-digit mobile number.',
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

describe('entryBody and ids', () => {
  it('sends a numeric bill and leaves out an empty store', () => {
    expect(entryBody(filled({ customerName: ' Ravi Kumar ' }))).toEqual({ customerName: 'Ravi Kumar', customerMobile: '9811111111', billAmount: 1500, consent: true, storeId: 's1' });
    expect(entryBody(filled({ storeId: '' }))).not.toHaveProperty('storeId');
    expect(entryFieldId('billAmount')).toBe('ld-entry-billAmount');
  });
});
