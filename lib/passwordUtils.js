/**
 * Password policy enforcement
 */

const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

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

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export { PASSWORD_POLICY };
