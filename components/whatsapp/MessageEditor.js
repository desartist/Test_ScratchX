'use client';

import React from 'react';
import styles from './whatsapp.module.css';

export default function MessageEditor({ value, onChange }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>Message</label>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
      />
    </div>
  );
}
