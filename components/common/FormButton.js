'use client';

import React from 'react';

import styles from './FormButton.module.css';

export default function FormButton({
  isLoading,
  variant = 'primary',
  fullWidth,
  children,
  disabled,
  className,
  ...props
}) {
  const buttonClass = `${styles.button} ${styles[variant]} ${
    fullWidth ? styles.fullWidth : ''
  } ${className || ''}`;

  return (
    <button
      className={buttonClass}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className={styles.spinner}></span>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
