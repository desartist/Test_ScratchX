// Shared validation for the auth forms (login, register, reset password).
//
// Email: a stricter format check than the old "has an @ and a dot" regex —
// that older pattern let almost anything through as the local part (e.g.
// "£€$**!{£{.@gmail.com" passed), since `[^\s@]` only excludes whitespace
// and "@". This restricts the local/domain parts to the characters real
// email addresses actually use.
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test((email || "").trim());
}

// Password character policy — deliberately applied only where a NEW
// password is being *set* (register, reset-password/confirm), never on
// login: a login field must accept whatever an account's real password
// already is, so restricting login here could lock a real user out of
// their own account. Disallows:
//   - whitespace (leading, trailing, or internal)
//   - quotes and angle brackets ( " ' ` < > ) — common injection vectors
//   - backslash and pipe ( \ | ) — can break shell/regex/CSV-style parsing
//   - non-ASCII characters (emoji, currency symbols, etc.)
// Everything else printable-ASCII (letters, digits, and the remaining
// punctuation) is allowed.
const PASSWORD_DISALLOWED_REGEX = /[\s"'`<>\\|]|[^\x00-\x7F]/;

export const PASSWORD_POLICY_MESSAGE =
  'Password cannot contain spaces, " \' ` < > \\ | or non-English characters';

export function getPasswordPolicyError(password) {
  if (PASSWORD_DISALLOWED_REGEX.test(password || "")) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return null;
}
