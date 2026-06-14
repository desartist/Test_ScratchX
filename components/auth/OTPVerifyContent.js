'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '../layouts/AuthLayout';
import OTPVerifyForm from './OTPVerifyForm';
import styles from '../auth/OTPVerifyContent.module.css';

export default function OTPVerifyContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam) {
      setPhone(decodeURIComponent(phoneParam));
    }
  }, [searchParams]);

  return (
    <AuthLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Verify OTP</h1>
          <p className={styles.subtitle}>
            Enter the 6-digit code sent to {phone || 'your phone'}
          </p>
        </header>

        <section className={styles.formSection}>
          {phone ? (
            <OTPVerifyForm phone={phone} />
          ) : (
            <div className={styles.warning}>
              <p>Phone number not found. Please start over.</p>
              <Link href="/auth/otp" className={styles.backLink}>
                Back to OTP Request
              </Link>
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            <Link href="/auth/otp" className={styles.backLink}>
              Use a different phone number
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}
