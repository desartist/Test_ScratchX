'use client';

import React, { useState } from 'react';
import { useAuthContext } from './AuthContext';
import FormInput from '../common/FormInput';
import FormButton from '../common/FormButton';
import FormError from '../common/FormError';
import FormSuccess from '../common/FormSuccess';
import styles from './SignupForm.module.css';

export default function SignupForm() {
  const { signup, error, isLoading, clearError } = useAuthContext();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

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

    if (!firstName || firstName.trim() === '') {
      errors.firstName = 'First name is required';
    }

    if (!lastName || lastName.trim() === '') {
      errors.lastName = 'Last name is required';
    }

    if (!email || email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!phone || phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

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
    setSuccessMessage('');

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await signup({
        firstName,
        lastName,
        email,
        phone,
        password,
      });

      setSuccessMessage('Account created successfully! Redirecting to dashboard...');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
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
      {successMessage && <FormSuccess message={successMessage} />}

      <div className={styles.nameGrid}>
        <FormInput
          label="First Name"
          type="text"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            if (validationErrors.firstName) {
              setValidationErrors(prev => ({ ...prev, firstName: '' }));
            }
          }}
          placeholder="Enter your first name"
          error={validationErrors.firstName}
          required
        />

        <FormInput
          label="Last Name"
          type="text"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            if (validationErrors.lastName) {
              setValidationErrors(prev => ({ ...prev, lastName: '' }));
            }
          }}
          placeholder="Enter your last name"
          error={validationErrors.lastName}
          required
        />
      </div>

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
        placeholder="Enter your email"
        error={validationErrors.email}
        required
      />

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
        placeholder="Enter your phone number"
        error={validationErrors.phone}
        required
      />

      <FormInput
        label="Password"
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
        Create Account
      </FormButton>
    </form>
  );
}
