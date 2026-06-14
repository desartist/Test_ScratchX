'use client';

import React from 'react';

import { useState } from 'react';
import styles from './FormInput.module.css';

export default function FormInput({
  label,
  error,
  helpText,
  className,
  ...props
}) {
  const [id] = useState(() => 'input-' + Math.random().toString(36).substr(2, 9));
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input
        id={id}
        aria-describedby={error ? errorId : helpText ? helpId : undefined}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        {...props}
      />
      {error && <span id={errorId} className={styles.error}>{error}</span>}
      {!error && helpText && (
        <span id={helpId} className={styles.helpText}>{helpText}</span>
      )}
    </div>
  );
}
