'use client';

import React from 'react';

import styles from './FormSuccess.module.css';

export default function FormSuccess({ message }) {
  return (
    <div className={styles.container}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M8 12l3 3 6-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.message}>{message}</span>
    </div>
  );
}
