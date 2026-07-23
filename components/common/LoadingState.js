import React from 'react';
import styles from './LoadingState.module.css';

/**
 * The single loading design used across the app: a bare spinner + message,
 * no card/background/shadow wrapper.
 */
export default function LoadingState({ message = 'Loading...', fullScreen = false }) {
  return (
    <div className={`${styles.wrap} ${fullScreen ? styles.fullScreen : ''}`} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <p className={styles.text}>{message}</p>
    </div>
  );
}
