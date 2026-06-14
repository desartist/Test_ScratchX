'use client'
import React from 'react';;

import Link from 'next/link';
import { AuthLayout } from '../../../components/layouts/AuthLayout';
import PasswordResetRequestForm from '../../../components/auth/PasswordResetRequestForm';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>Enter your email to receive reset instructions</p>
        </header>

        <section className={styles.formSection}>
          <PasswordResetRequestForm />
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Remember your password?{' '}
            <Link href="/auth/login" className={styles.loginLink}>
              Sign in
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}
