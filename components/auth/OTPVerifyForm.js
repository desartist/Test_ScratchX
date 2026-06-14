'use client';

import React, { useState } from 'react';
import { useAuthContext } from './AuthContext';
import OTPInput from './OTPInput';
import FormButton from '../common/FormButton';
import FormError from '../common/FormError';
import styles from './OTPVerifyForm.module.css';

export default function OTPVerifyForm({ phone }) {
  const { verifyOTP, sendOTP, error, isLoading, clearError } = useAuthContext();
  const [code, setCode] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isResending, setIsResending] = useState(false);

  const validateForm = () => {
    const errors = {};

    if (!code || code.length !== 6) {
      errors.code = 'Please enter a valid 6-digit OTP';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await verifyOTP(phone, code);
      // Success is handled by the context (redirects to dashboard)
    } catch (err) {
      // Error is handled by context
    }
  };

  const handleResend = async () => {
    clearError();
    setCode('');
    setValidationErrors({});
    setIsResending(true);

    try {
      await sendOTP(phone);
      // Success message shown via error state in AuthContext
    } catch (err) {
      // Error is handled by context
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <div className={styles.inputWrapper}>
        <OTPInput
          length={6}
          value={code}
          onChange={setCode}
          error={validationErrors.code}
        />
        {validationErrors.code && (
          <span className={styles.errorText}>{validationErrors.code}</span>
        )}
      </div>

      <FormButton
        type="submit"
        isLoading={isLoading}
        fullWidth
        disabled={isLoading || code.length !== 6}
      >
        Verify OTP
      </FormButton>

      <div className={styles.resendSection}>
        <span className={styles.resendText}>Didn't receive the code?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || isLoading}
          className={styles.resendLink}
        >
          {isResending ? 'Sending...' : 'Resend OTP'}
        </button>
      </div>
    </form>
  );
}
