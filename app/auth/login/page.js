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
        <span className={styles.logoText}>Scratch</span>
        <span className={styles.logoX}>X</span>
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to your ScratchX account</p>
        </div>

        {/* Form */}
        <LoginForm />

        {/* Footer */}
        <p className={styles.signupLine}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
