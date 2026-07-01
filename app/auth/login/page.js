'use client';

import React from 'react';
import Link from 'next/link';
import LoginForm from '../../../components/auth/LoginForm';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <div className={styles.page}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <img src="/horizontal_logo.svg" alt="ScratchX" className={styles.logoImg} />
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Sign in to your account</h1>
          <p className={styles.subtitle}>Enter your credentials to continue</p>
        </div>

        {/* Form */}
        <LoginForm />

        {/* Footer */}
        <p className={styles.signupLine}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
