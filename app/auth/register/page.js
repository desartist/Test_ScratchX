'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '../../../components/auth/AuthContext';
import styles from './form.module.css';

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function RegisterPage() {
  const { signup, error, isLoading, clearError } = useAuthContext();
  const [form, setForm] = useState({
    yourName: '',
    email: '',
    password: '',
    confirmPassword: '',
    countryCode: '+91',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (validationErrors[field]) setValidationErrors(prev => ({ ...prev, [field]: '' }));
    if (error) clearError();
  };

  const validate = () => {
    const errors = {};
    if (!form.yourName.trim()) errors.yourName = 'Full name is required';
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!form.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const errors = validate();
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const parts = form.yourName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';

    try {
      await signup({
        firstName,
        lastName,
        email: form.email.trim().toLowerCase(),
        phone: `${form.countryCode}${form.phoneNumber.trim()}`,
        password: form.password,
      });
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('phone') || msg.includes('mobile')) {
        setValidationErrors(prev => ({ ...prev, phoneNumber: err.message }));
      } else if (msg.includes('email')) {
        setValidationErrors(prev => ({ ...prev, email: err.message }));
      } else if (msg.includes('password')) {
        setValidationErrors(prev => ({ ...prev, password: err.message }));
      }
      // leave other errors in the global `error` state as fallback
    }
  };
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);
  return (
    <div className={styles.page}>
      <div className={styles.logoWrap}>
        <img src="/horizontal_logo.svg" alt="ScratchX" className={styles.logoImg} />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Join ScratchX and start rewarding your customers.</p>
        </div>

        {error && !/(phone|mobile|email|password)/i.test(error) && (
          <div className={styles.errorBanner}>{error}</div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              className={`${styles.input} ${validationErrors.yourName ? styles.inputError : ''}`}
              placeholder="Your full name"
              value={form.yourName}
              onChange={set('yourName')}
              disabled={isLoading}
              autoComplete="name"
            />
            {validationErrors.yourName && (
              <span className={styles.fieldError}>{validationErrors.yourName}</span>
            )}
          </div>

          {/* Email */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={`${styles.input} ${validationErrors.email ? styles.inputError : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              disabled={isLoading}
              autoComplete="email"
            />
            {validationErrors.email && (
              <span className={styles.fieldError}>{validationErrors.email}</span>
            )}
          </div>

          {/* Phone */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Contact Number</label>
            <div className={`${styles.phoneWrap} ${validationErrors.phoneNumber ? styles.phoneWrapError : ''}`}>
              <select
                className={styles.countrySelect}
                value={form.countryCode}
                onChange={set('countryCode')}
                disabled={isLoading}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+971">+971</option>
                <option value="+65">+65</option>
              </select>
              <input
                type="tel"
                className={styles.phoneInput}
                placeholder="Phone number"
                value={form.phoneNumber}
                onChange={set('phoneNumber')}
                disabled={isLoading}
                maxLength={10}
              />
            </div>
            {validationErrors.phoneNumber && (
              <span className={styles.fieldError}>{validationErrors.phoneNumber}</span>
            )}
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${validationErrors.password ? styles.inputError : ''}`}
                placeholder="Min 8 characters"
                value={form.password}
                onChange={set('password')}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {validationErrors.password && (
              <span className={styles.fieldError}>{validationErrors.password}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirm Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className={`${styles.input} ${validationErrors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowConfirmPassword(v => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span className={styles.fieldError}>{validationErrors.confirmPassword}</span>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                Create Account
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className={styles.loginLink}>
          Already have an account?{' '}
          <Link href="/auth/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
