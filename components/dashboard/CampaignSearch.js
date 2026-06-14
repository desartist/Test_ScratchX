"use client";
import React, { useState, useEffect, useCallback } from "react";
import styles from "./CampaignSearch.module.css";

export default function CampaignSearch({ searchValue = "", onSearch }) {
  const [internalValue, setInternalValue] = useState(searchValue);

  // When external searchValue prop changes, update internal state
  useEffect(() => {
    setInternalValue(searchValue);
  }, [searchValue]);

  // Debounce: wait 300ms after internalValue changes, then call onSearch
  // Note: onSearch is NOT in dependencies—we want to debounce the input change,
  // not re-debounce every time the callback reference changes (which prevents
  // unnecessary timer resets if parent doesn't memoize the callback)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(internalValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [internalValue]); // Intentionally omit onSearch to prevent timer reset on callback change

  // Handle input change
  const handleSearchChange = useCallback((e) => {
    setInternalValue(e.target.value);
  }, []);

  // Handle clear button click
  const handleClear = useCallback(() => {
    setInternalValue("");
    onSearch?.("");
  }, [onSearch]);

  return (
    <div className={styles.searchContainer}>
      <span className={styles.searchIcon} aria-hidden="true">🔍</span>
      <input
        type="text"
        className={styles.input}
        placeholder="Search campaigns..."
        value={internalValue}
        onChange={handleSearchChange}
        aria-label="Search campaigns"
      />
      {internalValue && (
        <button
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
