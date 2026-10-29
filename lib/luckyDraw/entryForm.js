// Rules for the entry forms (the counter's Add entry sheet and the customer's QR form). Pure and
// client-safe; the API repeats them (entryService).
const MOBILE = /^[0-9]{10}$/;
const AMOUNT = /^\d+(\.\d{1,2})?$/;
// Deliberately loose: one @, no spaces, a dot in the domain. The inbox is the real check.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_EMAIL_LENGTH = 254;

export const isEmail = (value) => {
  const email = String(value ?? '').trim();
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
};

export const blankEntryForm = (storeId = '') => ({ customerName: '', customerMobile: '', customerEmail: '', billAmount: '', storeId, consent: false });

export const entryFieldId = (key) => `ld-entry-${key}`;

function contactErrors(form, errors) {
  const name = form.customerName.trim();
  if (!name) errors.customerName = 'Enter the full name.';
  else if (name.length < 2) errors.customerName = 'Use at least 2 characters.';

  if (!form.customerMobile) errors.customerMobile = 'Enter the WhatsApp number.';
  else if (!MOBILE.test(form.customerMobile)) errors.customerMobile = 'Enter a 10-digit number.';

  const email = String(form.customerEmail ?? '').trim();
  if (!email) errors.customerEmail = 'Enter the email address.';
  else if (!isEmail(email)) errors.customerEmail = 'Enter an email like name@example.com.';
}

/** Problems with the Add entry sheet, keyed by field, in the order the fields appear. */
export function entryFormErrors(form, { minBillAmount = 0, needsStore = false } = {}) {
  const errors = {};
  contactErrors(form, errors);

  const bill = String(form.billAmount ?? '').trim().replace(/,/g, '');
  if (!bill) errors.billAmount = 'Enter the bill amount.';
  else if (!AMOUNT.test(bill)) errors.billAmount = 'Enter the amount in rupees, like 1500.';
  else if (Number(bill) < minBillAmount) errors.billAmount = `Bills of ₹${minBillAmount.toLocaleString('en-IN')} or more can enter this draw.`;

  if (needsStore && !form.storeId) errors.storeId = 'Choose the store this bill is from.';
  if (!form.consent) errors.consent = 'Confirm the customer agreed to get messages about this draw.';
  return errors;
}

/** What POST /api/lucky-draws/campaigns/:id/entries expects. */
export function entryBody(form) {
  const body = {
    customerName: form.customerName.trim(),
    customerMobile: form.customerMobile,
    customerEmail: form.customerEmail.trim(),
    billAmount: Number(String(form.billAmount).trim().replace(/,/g, '')),
    consent: form.consent,
  };
  if (form.storeId) body.storeId = form.storeId;
  return body;
}

/** The customer's QR form: full name, WhatsApp number, email and consent (no bill amount). */
export const blankQrEntryForm = () => ({ customerName: '', customerMobile: '', customerEmail: '', consent: false });

export const qrFieldId = (key) => `ld-qr-${key}`;

export function qrEntryFormErrors(form) {
  const errors = {};
  contactErrors(form, errors);
  if (!form.consent) errors.consent = 'Tick this box to enter the draw.';
  return errors;
}
