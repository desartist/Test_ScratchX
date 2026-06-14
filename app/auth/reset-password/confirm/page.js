'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '../../../../components/layouts/AuthLayout';
import PasswordResetForm from '../../../../components/auth/PasswordResetForm';
import styles from './page.module.css';

function ConfirmResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <AuthLayout>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>Invalid Reset Link</h1>
            <p className={styles.subtitle}>The password reset link is missing or invalid</p>
          </header>

          <footer className={styles.footer}>
            <p className={styles.footerText}>
              <Link href="/auth/reset-password" className={styles.loginLink}>
                Request a new reset link
              </Link>
            </p>
          </footer>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>Enter your new password below</p>
        </header>

        <section className={styles.formSection}>
          <PasswordResetForm token={token} />
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            <Link href="/auth/login" className={styles.loginLink}>
              Back to sign in
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmResetPasswordContent />
    </Suspense>
  );
}
