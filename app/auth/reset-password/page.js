'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '../../../components/auth/AuthContext';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  const { requestPasswordReset, error, isLoading, clearError } = useAuthContext();
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    try {
      await requestPasswordReset(email);
      setSuccess(true);
      setEmail('');
    } catch {
      // error handled by AuthContext
    }
  };

  return (
    <div className={styles.page}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <img src="/horizontal_logo.svg" alt="ScratchX" className={styles.logoImg} />
      </div>

      <div className={styles.card}>
        {/* Icon */}
        <div className={styles.iconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {/* Header */}
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your email and we&apos;ll send you reset instructions.
          </p>
        </div>

        {/* Success state */}
        {success ? (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className={styles.successTitle}>Check your inbox</h3>
            <p className={styles.successText}>
              We&apos;ve sent password reset instructions to your email address.
            </p>
            <Link href="/auth/login" className={styles.backBtn}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* API error */}
            {error && (
              <div className={styles.errorBanner}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* Email field */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={`${styles.input} ${validationError ? styles.inputError : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={isLoading}
                autoComplete="email"
                required
              />
              {validationError && (
                <span className={styles.fieldError}>{validationError}</span>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  Send Reset Instructions
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to login */}
        {!success && (
          <p className={styles.loginLine}>
            Remember your password?{' '}
            <Link href="/auth/login">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
