'use client';

import React from 'react';
import styles from './StoreCardHeader.module.css';

export default function StoreCardHeader({ name, city, state, status }) {
  return (
    <div className={styles.header}>
      <div>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.location}>
          📍 {city}, {state}
        </p>
      </div>
    </div>
  );
}
