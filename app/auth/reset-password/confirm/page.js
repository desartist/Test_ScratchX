'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '../../../../components/auth/AuthContext';
import styles from '../page.module.css';

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

function ConfirmResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword, error, isLoading, clearError } = useAuthContext();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errors = {};
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
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
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch {
      // error handled by AuthContext
    }
  };

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.logoWrap}>
          <img src="/horizontal_logo.svg" alt="ScratchX" className={styles.logoImg} />
        </div>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Invalid Reset Link</h1>
            <p className={styles.subtitle}>This password reset link is missing or has expired.</p>
          </div>
          <Link href="/auth/reset-password" className={styles.backBtn}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.logoWrap}>
          <img src="/horizontal_logo.svg" alt="ScratchX" className={styles.logoImg} />
        </div>
        <div className={styles.card}>
          <div className={styles.successBox}>
            <div className={styles.successIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className={styles.successTitle}>Password updated!</h3>
            <p className={styles.successText}>Your password has been reset. You can now sign in with your new password.</p>
            <Link href="/auth/login" className={styles.backBtn}>Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.logoWrap}>
        <img src="/horizontal_logo.svg" alt="ScratchX" className={styles.logoImg} />
      </div>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>Enter your new password below.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && (
            <div className={styles.errorBanner}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* New Password */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>New Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${validationErrors.password ? styles.inputError : ''}`}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: '' }));
                }}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#8896a7', display: 'flex', alignItems: 'center', padding: 4 }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {validationErrors.password && (
              <span className={styles.fieldError}>{validationErrors.password}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Confirm Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`${styles.input} ${validationErrors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) setValidationErrors(prev => ({ ...prev, confirmPassword: '' }));
                }}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#8896a7', display: 'flex', alignItems: 'center', padding: 4 }}
              >
                <EyeIcon open={showConfirm} />
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
                Reset Password
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className={styles.loginLine}>
          Remember your password? <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmResetContent />
    </Suspense>
  );
}
