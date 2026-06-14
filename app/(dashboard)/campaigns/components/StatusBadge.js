'use client';
import React from "react"
import styles from './StatusBadge.module.css';

export default function StatusBadge({ status }) {
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return styles.statusActive;
      case 'draft':
        return styles.statusDraft;
      case 'paused':
        return styles.statusPaused;
      case 'ended':
        return styles.statusEnded;
      default:
        return styles.statusDraft;
    }
  };

  const getStatusIcon = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '●';
      case 'draft':
        return '◯';
      case 'paused':
        return '⏸';
      case 'ended':
        return '◼';
      default:
        return '◯';
    }
  };

  return (
    <span
      className={`${styles.badge} ${getStatusClass()}`}
      role="status"
      aria-label={`Campaign status: ${status || 'unknown'}`}
    >
      <span className={styles.icon} aria-hidden="true">{getStatusIcon()}</span>
      <span className={styles.text}>{status}</span>
    </span>
  );
}
