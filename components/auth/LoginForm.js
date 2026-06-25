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
  const [submitting, setSubmitting] = useState(false);
  const [deactivatedEmail, setDeactivatedEmail] = useState(null);
  const [reactivating, setReactivating] = useState(false);

  // Detect deactivation from error message
  const isDeactivated = error?.includes('deactivated');

  // On mount: restore remembered email and try Credential Management API
  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
    // Browser Credential Management API — auto-fill if credentials are saved
    if (window.PasswordCredential && navigator.credentials) {
      navigator.credentials.get({ password: true, mediation: 'silent' })
        .then((cred) => {
          if (cred && cred.type === 'password') {
            setEmail(cred.id);
            setPassword(cred.password);
            setRememberMe(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  // When deactivation error is detected, set the deactivated email
  React.useEffect(() => {
    if (isDeactivated && email && !deactivatedEmail) {
      setDeactivatedEmail(email);
    }
  }, [isDeactivated, email, deactivatedEmail]);

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
    setDeactivatedEmail(null); // Clear deactivation state when user changes email
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: '' }));
  };

  const handleReactivate = async () => {
    if (!deactivatedEmail || !password.trim()) {
      alert("Please enter your password");
      return;
    }

    setReactivating(true);
    try {
      const response = await fetch("/api/account/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deactivatedEmail, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setDeactivatedEmail(null);
      clearError();
      setPassword('');
      alert("Account reactivated! Please log in with your credentials.");
    } catch (err) {
      alert("Failed to reactivate: " + err.message);
    } finally {
      setReactivating(false);
    }
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

    setSubmitting(true);
    try {
      await login(email, password);

      // Ask the browser to save credentials after a successful login
      if (rememberMe && window.PasswordCredential && navigator.credentials) {
        try {
          const cred = new PasswordCredential({ id: email, password });
          await navigator.credentials.store(cred);
        } catch {
          // Credential Management API not supported or user dismissed — ignore
        }
      } else if (!rememberMe && navigator.credentials?.preventSilentAccess) {
        // Clear saved credentials if user unchecked Remember me
        navigator.credentials.preventSilentAccess();
        localStorage.removeItem('rememberEmail');
      }
    } catch (err) {
      // Handle deactivated account
      // The login function sets error in context, so check that instead
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={isDeactivated ? (e) => { e.preventDefault(); } : handleSubmit} className={styles.form}>
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {isDeactivated && (
        <div className={styles.reactivationBox}>
          <h4>✅ Reactivate Your Account</h4>
          <p>
            Your account has been deactivated. Enter your password in the field below,
            then click the <strong>Reactivate Account</strong> button to restore access to your account.
            <br/>
            <span style={{ fontSize: '0.9em', opacity: 0.8 }}>Your data is safe and will be restored.</span>
          </p>
          <button
            type="button"
            onClick={() => handleReactivate()}
            disabled={reactivating || !password.trim()}
            className={styles.reactivateBtn}
          >
            {reactivating ? "Reactivating..." : "Reactivate Account"}
          </button>
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
          autoComplete="email"
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
            autoComplete="current-password"
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

      <button type="submit" className={styles.submitButton} disabled={submitting}>
        {submitting && <span className={styles.loadingSpinner}></span>}
        {submitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
