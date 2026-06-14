// components/dashboard/ProgressBar.js
"use client";
import React from "react";
import styles from "./ProgressBar.module.css";

export default function ProgressBar({
  current = 0,
  total = 100,
  showLabel = true,
  status = "normal", // 'normal' | 'warning' | 'critical'
}) {
  // Use actual API data - only default to 1 to avoid NaN, not to force a percentage
  const validTotal = total && total > 0 ? total : 1;
  const percentage = validTotal > 0 ? Math.round((current / validTotal) * 100) : 0;

  return (
    <div className={styles.container}>
      {showLabel && (
        <div className={styles.label}>
          <span className={styles.labelText}>Scratch Allocation</span>
          <span className={styles.percentage}>{percentage}%</span>
        </div>
      )}
      <div className={`${styles.bar} ${styles[status]}`}>
        <div
          className={styles.fill}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
