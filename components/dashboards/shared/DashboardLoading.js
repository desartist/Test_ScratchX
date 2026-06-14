import React from 'react';
import styles from './DashboardLoading.module.css';

export default function DashboardLoading({ message = 'Loading dashboard...' }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <p className={styles.text}>{message}</p>
    </div>
  );
}
