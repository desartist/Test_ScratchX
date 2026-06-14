'use client';

import React from 'react';
import styles from './SearchInput.module.css';

export default function SearchInput({
  placeholder = 'Search...',
  value = '',
  onChange,
  onClear,
  className = ''
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className={styles.clearButton}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
