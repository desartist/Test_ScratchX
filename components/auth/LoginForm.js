'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from './AuthContext';
import styles from './LoginForm.module.css';

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

export default function LoginForm() {
  const { login, error, isLoading, clearError } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!email || email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password || password.trim() === '') {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    return errors;
  };

  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const errors = validateForm();
    setValidationErrors(errors);
    setTouchedFields({ email: true, password: true });
    if (Object.keys(errors).length > 0) return;
    if (rememberMe) {
      localStorage.setItem('rememberEmail', email);
    } else {
      localStorage.removeItem('rememberEmail');
    }
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Email Field */}
      <div className={styles.fieldWrapper}>
        <label htmlFor="email" className={styles.label}>Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleFieldBlur('email')}
          className={`${styles.inputField} ${validationErrors.email ? styles.error : ''}`}
          placeholder="name@company.com"
          disabled={isLoading}
          autoComplete="email"
          required
        />
        {touchedFields.email && validationErrors.email && (
          <span className={styles.errorMessage}>
            <span>✕</span> {validationErrors.email}
          </span>
        )}
      </div>

      {/* Password Field */}
      <div className={styles.fieldWrapper}>
        <label htmlFor="password" className={styles.label}>Password</label>
        <div className={styles.passwordWrapper}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => handleFieldBlur('password')}
            className={`${styles.inputField} ${validationErrors.password ? styles.error : ''}`}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="current-password"
            required
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
        {touchedFields.password && validationErrors.password && (
          <span className={styles.errorMessage}>
            <span>✕</span> {validationErrors.password}
          </span>
        )}
      </div>

      {/* Remember & Forgot */}
      <div className={styles.footer}>
        <label className={styles.rememberMe}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <span className={styles.rememberLabel}>Remember me</span>
        </label>
        <Link href="/auth/reset-password" className={styles.forgotLink}>
          Forgot password?
        </Link>
      </div>

      <button type="submit" className={styles.submitButton} disabled={isLoading}>
        {isLoading && <span className={styles.loadingSpinner}></span>}
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
