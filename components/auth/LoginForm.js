'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from './AuthContext';
import styles from './LoginForm.module.css';
import { Mail, Lock, Smartphone, Loader } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('email'); // email or otp
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deactivatedEmail, setDeactivatedEmail] = useState(null);
  const [reactivating, setReactivating] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerificationSent, setOtpVerificationSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');

  const isDeactivated = error?.includes('deactivated');

  const formatPhoneNumber = (phoneInput) => {
    const cleaned = phoneInput.replace(/\D/g, '');
    if (cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    if (cleaned.startsWith('+')) {
      return phoneInput;
    }
    return '+91' + cleaned;
  };

  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
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
    setDeactivatedEmail(null);
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

      if (rememberMe && window.PasswordCredential && navigator.credentials) {
        try {
          const cred = new PasswordCredential({ id: email, password });
          await navigator.credentials.store(cred);
        } catch {
          // Credential Management API not supported
        }
      } else if (!rememberMe && navigator.credentials?.preventSilentAccess) {
        navigator.credentials.preventSilentAccess();
        localStorage.removeItem('rememberEmail');
      }
    } catch (err) {
      // Handle deactivated account
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleOTPClick = () => {
    setActiveTab('otp');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone || phone.trim() === '') {
      alert('Please enter a phone number');
      return;
    }

    setOtpSending(true);
    setOtpError('');
    clearError();
    try {
      const formattedPhone = formatPhoneNumber(phone);

      const response = await fetch('/api/auth/otp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send OTP');

      setPhone(formattedPhone);
      setOtpVerificationSent(true);
      setOtpCode('');
      setOtpError('');
    } catch (err) {
      setOtpError('Error sending OTP: ' + err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim() === '') {
      setOtpError('Please enter the OTP code');
      return;
    }

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setOtpError('OTP must be 6 digits');
      return;
    }

    setOtpVerifying(true);
    setOtpError('');
    try {
      const response = await fetch('/api/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'OTP verification failed');

      // Store tokens
      if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

      // Redirect to dashboard or store creation
      const redirectTo = data.redirectTo || '/dashboard';
      window.location.href = redirectTo;
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleBackFromVerification = () => {
    setOtpVerificationSent(false);
    setOtpCode('');
    setOtpError('');
  };

  return (
    <form onSubmit={isDeactivated ? (e) => { e.preventDefault(); } : handleSubmit} className={styles.form}>
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Auth Method Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'email' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('email')}
        >
          <Mail size={16} />
          <span>Email</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'otp' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('otp')}
        >
          <Smartphone size={16} />
          <span>Phone OTP</span>
        </button>
      </div>

      {/* Email Login Tab */}
      {activeTab === 'email' && (
        <div className={styles.tabContent}>
          {isDeactivated && (
            <div className={styles.reactivationBox}>
              <h4>✅ Reactivate Your Account</h4>
              <p>
                Your account has been deactivated. Enter your password in the field below,
                then click the <strong>Reactivate Account</strong> button to restore access.
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
            <label htmlFor="email" className={styles.label}>
              <Mail size={14} /> Email Address
            </label>
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
            <label htmlFor="password" className={styles.label}>
              <Lock size={14} /> Password
            </label>
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

          {/* Submit Button */}
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting && <Loader size={16} className={styles.spinner} />}
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      )}

      {/* OTP Tab */}
      {activeTab === 'otp' && (
        <div className={styles.tabContent}>
          {!otpVerificationSent ? (
            <>
              <p className={styles.otpHelpText}>Enter your registered phone number to receive an OTP</p>

              {otpError && (
                <div className={styles.errorBanner}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <span>{otpError}</span>
                </div>
              )}

              <div className={styles.fieldWrapper}>
                <label htmlFor="phone" className={styles.label}>
                  <Smartphone size={14} /> Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={styles.inputField}
                  placeholder="98765 43210"
                  disabled={otpSending}
                />
                <p className={styles.helperText}>
                  {phone && !/^\+/.test(phone) ? '✓ +91 will be added automatically' : ''}
                </p>
              </div>
              <button type="button" className={styles.submitButton} onClick={handleSendOTP} disabled={otpSending}>
                {otpSending && <Loader size={16} className={styles.spinner} />}
                {otpSending ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div className={styles.verificationBox}>
                <h3>✓ OTP Sent!</h3>
                <p>We've sent a 6-digit code to<br/><strong>{phone}</strong></p>
              </div>

              {otpError && (
                <div className={styles.errorBanner}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <span>{otpError}</span>
                </div>
              )}

              <div className={styles.fieldWrapper}>
                <label htmlFor="otpCode" className={styles.label}>
                  <span>Enter OTP Code</span>
                </label>
                <input
                  id="otpCode"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={styles.inputField}
                  placeholder="000000"
                  maxLength="6"
                  disabled={otpVerifying}
                  autoFocus
                />
                <p className={styles.helperText}>
                  {otpCode.length === 6 ? '✓ Complete' : `${6 - otpCode.length} digits remaining`}
                </p>
              </div>

              <button
                type="button"
                className={styles.submitButton}
                onClick={handleVerifyOTP}
                disabled={otpVerifying || otpCode.length !== 6}
              >
                {otpVerifying && <Loader size={16} className={styles.spinner} />}
                {otpVerifying ? 'Verifying...' : 'Verify & Login'}
              </button>

              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackFromVerification}
                disabled={otpVerifying}
              >
                Back
              </button>
            </>
          )}
        </div>
      )}

      {/* Divider - Hidden until Google OAuth is configured */}
      {/* <div className={styles.divider}>
        <span>OR</span>
      </div> */}

      {/* Google OAuth Button - Hidden until configured */}
      {/* <button type="button" className={styles.googleButton} onClick={handleGoogleLogin}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button> */}


    </form>
  );
}