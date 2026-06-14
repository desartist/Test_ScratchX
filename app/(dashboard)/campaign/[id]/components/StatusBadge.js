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
        return '●'; // Solid dot for active
      case 'draft':
        return '◯'; // Empty dot for draft
      case 'paused':
        return '⏸'; // Pause symbol
      case 'ended':
        return '◼'; // Square for ended
      default:
        return '◯';
    }
  };

  return (
    <div className={`${styles.badge} ${getStatusClass()}`}>
      <span className={styles.icon}>{getStatusIcon()}</span>
      <span className={styles.text}>{status?.toUpperCase()}</span>
    </div>
  );
}
