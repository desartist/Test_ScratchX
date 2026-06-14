'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from './AuthContext';
import FormInput from '../common/FormInput';
import FormButton from '../common/FormButton';
import FormError from '../common/FormError';
import FormSuccess from '../common/FormSuccess';
import styles from './OTPRequestForm.module.css';

export default function OTPRequestForm() {
  const router = useRouter();
  const { sendOTP, error, isLoading, clearError } = useAuthContext();
  const [phone, setPhone] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    if (!phone || phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else {
      // Basic phone validation - at least 10 digits
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        errors.phone = 'Please enter a valid phone number (at least 10 digits)';
      }
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
      await sendOTP(phone);
      setSuccessMessage('OTP sent successfully! Check your phone for the code.');

      // Redirect to verify page after 2 seconds
      setTimeout(() => {
        router.push(`/auth/otp/verify?phone=${encodeURIComponent(phone)}`);
      }, 2000);
    } catch (err) {
      // Error is handled by context
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}
      {successMessage && <FormSuccess message={successMessage} />}

      <FormInput
        label="Phone Number"
        type="tel"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          if (validationErrors.phone) {
            setValidationErrors(prev => ({ ...prev, phone: '' }));
          }
        }}
        placeholder="+91 98765 43210"
        error={validationErrors.phone}
        helpText="We'll send an OTP to this number"
        required
      />

      <FormButton
        type="submit"
        isLoading={isLoading}
        fullWidth
        disabled={isLoading}
      >
        Send OTP
      </FormButton>
    </form>
  );
}
