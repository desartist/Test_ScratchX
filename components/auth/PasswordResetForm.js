'use client';

import React, { useState } from 'react';
import { useAuthContext } from './AuthContext';
import FormInput from '../common/FormInput';
import FormButton from '../common/FormButton';
import FormError from '../common/FormError';
import styles from './PasswordResetForm.module.css';

export default function PasswordResetForm({ token, onSuccess }) {
  const { resetPassword, error, isLoading, clearError } = useAuthContext();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validatePassword = (pwd) => {
    const hasMinLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*]/.test(pwd);

    return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  };

  const validateForm = () => {
    const errors = {};

    if (!password || password.trim() === '') {
      errors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      errors.password = 'Password must contain at least 8 characters, uppercase, lowercase, number, and special character';
    }

    if (!confirmPassword || confirmPassword.trim() === '') {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      await resetPassword(token, password);
      if (onSuccess) {
        onSuccess();
      }
      setPassword('');
      setConfirmPassword('');
      setValidationErrors({});
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <FormInput
        label="New Password"
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (validationErrors.password) {
            setValidationErrors(prev => ({ ...prev, password: '' }));
          }
        }}
        placeholder="Create a strong password"
        error={validationErrors.password}
        helpText="Min 8 chars, uppercase, lowercase, number, special char"
        required
      />

      <FormInput
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (validationErrors.confirmPassword) {
            setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
          }
        }}
        placeholder="Confirm your password"
        error={validationErrors.confirmPassword}
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
