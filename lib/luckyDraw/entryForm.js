// Rules for the Add entry dialog. Pure and client-safe; the API repeats them (entryService).
const MOBILE = /^[0-9]{10}$/;
const AMOUNT = /^\d+(\.\d{1,2})?$/;

export const blankEntryForm = (storeId = '') => ({ customerName: '', customerMobile: '', billAmount: '', storeId, consent: false });

export const entryFieldId = (key) => `ld-entry-${key}`;

/** Problems with the Add entry dialog, keyed by field, in the order the fields appear. */
export function entryFormErrors(form, { minBillAmount = 0, needsStore = false } = {}) {
  const errors = {};
  const name = form.customerName.trim();
  if (!name) errors.customerName = "Enter the customer's name.";
  else if (name.length < 2) errors.customerName = 'Use at least 2 characters.';

  if (!form.customerMobile) errors.customerMobile = "Enter the customer's mobile number.";
  else if (!MOBILE.test(form.customerMobile)) errors.customerMobile = 'Enter a 10-digit mobile number.';

  const bill = String(form.billAmount ?? '').trim().replace(/,/g, '');
  if (!bill) errors.billAmount = 'Enter the bill amount.';
  else if (!AMOUNT.test(bill)) errors.billAmount = 'Enter the amount in rupees, like 1500.';
  else if (Number(bill) < minBillAmount) errors.billAmount = `Bills of ₹${minBillAmount.toLocaleString('en-IN')} or more can enter this draw.`;

  if (needsStore && !form.storeId) errors.storeId = 'Choose the store this bill is from.';
  if (!form.consent) errors.consent = 'Confirm the customer agreed to get SMS about this draw.';
  return errors;
}

/** What POST /api/lucky-draws/campaigns/:id/entries expects. */
export function entryBody(form) {
  const body = {
    customerName: form.customerName.trim(),
    customerMobile: form.customerMobile,
    billAmount: Number(String(form.billAmount).trim().replace(/,/g, '')),
    consent: form.consent,
  };
  if (form.storeId) body.storeId = form.storeId;
  return body;
}
