'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from './AuthContext';
import FormInput from '../common/FormInput';
import FormButton from '../common/FormButton';
import FormError from '../common/FormError';
import FormSuccess from '../common/FormSuccess';
import styles from './PasswordResetRequestForm.module.css';

export default function PasswordResetRequestForm() {
  const router = useRouter();
  const { requestPasswordReset, error, isLoading, clearError } = useAuthContext();
  const [email, setEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    const errors = {};

    if (!email || email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setSuccessMessage('');

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const result = await requestPasswordReset(email);
      setEmail('');
      setValidationErrors({});

      // Stopgap while email delivery isn't reliably configured: the API
      // hands back a live reset token, so skip straight to the set-new-
      // password screen instead of waiting on an email that may never arrive.
      if (result?.resetToken) {
        router.push(`/auth/reset-password?token=${result.resetToken}`);
        return;
      }

      setSuccessMessage('Email sent with reset instructions');
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}
      {successMessage && <FormSuccess message={successMessage} />}

      <FormInput
        label="Email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (validationErrors.email) {
            setValidationErrors(prev => ({ ...prev, email: '' }));
          }
        }}
        placeholder="Enter your email address"
        error={validationErrors.email}
        required
      />

      <FormButton
        type="submit"
        isLoading={isLoading}
        fullWidth
        disabled={isLoading}
      >
        Reset Password
      </FormButton>
    </form>
  );
}
