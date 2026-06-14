'use client'
import React from 'react';;

import styles from './StatCard.module.css';

export default function StatCard({ label, value, color = 'primary' }) {
  return (
    <article className={`${styles.card} ${styles[color]}`}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
    </article>
  );
}
