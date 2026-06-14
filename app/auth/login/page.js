'use client';

import React from 'react';
import Link from 'next/link';
import { AuthLayout } from '../../../components/layouts/AuthLayout';
import LoginForm from '../../../components/auth/LoginForm';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in with OTP</p>
        </header>

        <section className={styles.formSection}>
          <LoginForm />
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Don't have an account?{' '}
            <Link href="/auth/signup" className={styles.signupLink}>
              Sign up
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}
