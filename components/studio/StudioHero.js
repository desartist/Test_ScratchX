'use client';

import React from 'react';
import styles from './StudioHero.module.css';

export default function StudioHero() {
  return (
    <div className={styles.hero}>
      <div className={styles.badge}>Coming Soon</div>

      <div className={styles.icon}>🎨</div>

      <h1 className={styles.title}>ScratchX Studio</h1>

      <p className={styles.subtitle}>
        Design, customize and launch engaging scratch experiences for your customers.
      </p>

      <p className={styles.description}>
        Create branded campaigns with powerful tools that make scratches irresistible to your customers.
      </p>
    </div>
  );
}
