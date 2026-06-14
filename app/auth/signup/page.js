'use client'
import React from 'react';;

import Link from 'next/link';
import { AuthLayout } from '../../../components/layouts/AuthLayout';
import SignupForm from '../../../components/auth/SignupForm';
import styles from './page.module.css';

export default function SignupPage() {
  return (
    <AuthLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Join ScratchX today</p>
        </header>

        <section className={styles.formSection}>
          <SignupForm />
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link href="/auth/login" className={styles.loginLink}>
              Sign in
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}
