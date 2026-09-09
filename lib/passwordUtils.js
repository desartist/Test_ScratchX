/**
 * Password policy enforcement
 */

const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  // Angle brackets and pipe removed from the "acceptable" set below — see
  // DISALLOWED_CHARS_REGEX, which rejects them outright regardless of this
  // whitelist.
  specialChars: '!@#$%^&*()_+-=[]{};:,.?',
};

// Characters rejected outright, on top of the specialChars whitelist above:
// whitespace, quotes/backtick/angle-brackets (injection-risk), backslash and
// pipe (can break shell/regex/CSV-style parsing), and any non-ASCII
// character (emoji, currency symbols, etc). Applied only where a NEW
// password is being *set* (signup, reset, change-password) — never at
// login, since a login field must accept whatever an account's real
// password already is.
const DISALLOWED_CHARS_REGEX = /[\s"'`<>\\|]|[^\x00-\x7F]/;

export function validatePasswordPolicy(password) {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (PASSWORD_POLICY.requireSpecialChar) {
    const hasSpecial = PASSWORD_POLICY.specialChars.split('').some((char) =>
      password.includes(char)
    );
    if (!hasSpecial) {
      errors.push(
        `Password must contain at least one special character: ${PASSWORD_POLICY.specialChars}`
      );
    }
  }

  if (DISALLOWED_CHARS_REGEX.test(password)) {
    errors.push(
      'Password cannot contain spaces, " \' ` < > \\ | or non-English characters'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export { PASSWORD_POLICY };
