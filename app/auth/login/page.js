'use client';

import React from 'react';
import LoginForm from '../../../components/auth/LoginForm';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <div className={styles.page}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <img src="/horizontal_logo.webp" alt="ScratchX" className={styles.logoImg} />
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Login</h1>
          <p className={styles.subtitle}>Please sign in to continue.</p>
        </div>

        {/* Form */}
        <LoginForm />
      </div>
    </div>
  );
}
