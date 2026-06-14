'use client';

import React, { useRef, useEffect, useState } from 'react';
import styles from './OTPInput.module.css';

export default function OTPInput({
  length = 6,
  value = '',
  onChange,
  error,
}) {
  const inputRefs = useRef([]);
  const [values, setValues] = useState(value.split('').slice(0, length).padEnd(length, ''));

  useEffect(() => {
    if (value !== values.join('')) {
      setValues(value.split('').slice(0, length).padEnd(length, ''));
    }
  }, [value, length]);

  const handleChange = (index, char) => {
    if (!/^\d?$/.test(char)) return;

    const newValues = [...values];
    newValues[index] = char;
    setValues(newValues);
    onChange?.(newValues.join(''));

    // Auto-focus next input
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValues = [...values];
      if (values[index]) {
        newValues[index] = '';
      } else if (index > 0) {
        newValues[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      }
      setValues(newValues);
      onChange?.(newValues.join(''));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    const digits = pastedText.replace(/\D/g, '').slice(0, length);

    const newValues = digits.split('').padEnd(length, '');
    setValues(newValues);
    onChange?.(newValues.join(''));

    // Focus last filled input or first empty
    const focusIndex = Math.min(digits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className={`${styles.container} ${error ? styles.error : ''}`}>
      <div className={styles.inputGroup}>
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength="1"
            value={values[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`OTP digit ${index + 1} of ${length}`}
            className={styles.input}
          />
        ))}
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
