'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from './AuthContext';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const { login, error, isLoading, clearError } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    const value = e.target.value;
    setEmail(value);
    if (validationErrors.email) {
      setValidationErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (validationErrors.password) {
      setValidationErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const errors = validateForm();
    setValidationErrors(errors);
    setTouchedFields({ email: true, password: true });

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Remember me functionality
    if (rememberMe) {
      localStorage.setItem('rememberEmail', email);
    } else {
      localStorage.removeItem('rememberEmail');
    }

    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Email Field */}
      <div className={styles.fieldWrapper}>
        <label htmlFor="email" className={styles.label}>
          Email Address
        </label>
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
        {!validationErrors.email && email && (
          <span className={styles.successCheck}>✓</span>
        )}
      </div>

      {/* Password Field */}
      <div className={styles.fieldWrapper}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => handleFieldBlur('password')}
          className={`${styles.inputField} ${validationErrors.password ? styles.error : ''}`}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="current-password"
          required
        />
        {touchedFields.password && validationErrors.password && (
          <span className={styles.errorMessage}>
            <span>✕</span> {validationErrors.password}
          </span>
        )}
        {!validationErrors.password && password && (
          <span className={styles.successCheck}>✓</span>
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

      {/* Submit Button */}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading && <span className={styles.loadingSpinner}></span>}
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      {/* Divider + Social Login — temporarily disabled */}
      {/* <div className={styles.divider}>
        <div className={styles.dividerLine}></div>
        <span className={styles.dividerText}>Or continue with</span>
        <div className={styles.dividerLine}></div>
      </div>

      <div className={styles.socialOptions}>
        <button
          type="button"
          className={styles.socialButton}
          disabled={isLoading}
          title="Sign in with Google"
        >
          <span className={styles.socialIcon}>🔐</span>
          <span>Google</span>
        </button>
        <button
          type="button"
          className={styles.socialButton}
          disabled={isLoading}
          onClick={() => {
            window.location.href = '/auth/otp';
          }}
          title="Sign in with OTP"
        >
          <span className={styles.socialIcon}>📱</span>
          <span>OTP</span>
        </button>
      </div> */}
    </form>
  );
}
