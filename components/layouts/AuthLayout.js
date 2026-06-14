'use client';

import React from 'react';
import styles from './AuthLayout.module.css';

export function AuthLayout({ children }) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {children}
      </div>
    </div>
  );
}
