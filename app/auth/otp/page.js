'use client'
import React from 'react';;

import Link from 'next/link';
import { AuthLayout } from '../../../components/layouts/AuthLayout';
import OTPRequestForm from '../../../components/auth/OTPRequestForm';
import styles from './page.module.css';

export default function OTPPage() {
  return (
    <AuthLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Login with OTP</h1>
          <p className={styles.subtitle}>Enter your phone number to continue</p>
        </header>

        <section className={styles.formSection}>
          <OTPRequestForm />
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Have an account?{' '}
            <Link href="/auth/login" className={styles.loginLink}>
              Login with email
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}
