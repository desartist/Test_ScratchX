'use client';

import React from 'react';
import styles from './StatsCard.module.css';

/**
 * Stat tile matching the dashboard card design: a lucide icon inside a
 * lavender rounded square, then the value and an uppercase label.
 */
export default function StatsCard({ value, label, icon, highlight }) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>{icon}</div>
      <div
        className={`${styles.value} ${highlight === 'red' ? styles.valueRed : ''}`}
      >
        {value}
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
