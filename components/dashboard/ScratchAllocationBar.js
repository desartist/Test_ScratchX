"use client";
import React from "react";
import styles from "./ScratchAllocationBar.module.css";

export default function ScratchAllocationBar({
  scratchUsed,
  scratchTotal,
  showLabel = true,
  compact = false,
}) {
  // Calculate scratch percentage for progress bar
  const scratchPercentage = scratchTotal > 0 ? (scratchUsed / scratchTotal) * 100 : 0;

  // Determine if scratches are low (less than 10% remaining)
  const scratchesLow = scratchPercentage > 90;

  // Format number with Indian locale
  const formatNumber = (num) => num.toLocaleString("en-IN");

  return (
    <div className={`${styles.container} ${compact ? styles.containerCompact : ""}`}>
      {showLabel && <p className={styles.label}>Scratch Allocation</p>}

      <div className={styles.barWrapper}>
        <div className={styles.bar}>
          <div
            className={`${styles.progress} ${scratchesLow ? styles.progressWarning : ""}`}
            style={{ width: `${scratchPercentage}%` }}
            role="progressbar"
            aria-valuenow={scratchPercentage}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Scratch allocation: ${formatNumber(scratchUsed)} of ${formatNumber(scratchTotal)}`}
          />
        </div>

        <div className={styles.statsRow}>
          <p className={styles.statLabel}>
            {formatNumber(scratchUsed)} / {formatNumber(scratchTotal)}
          </p>
          <p className={`${styles.statValue} ${styles.remaining}`}>
            {formatNumber(scratchTotal - scratchUsed)} left
          </p>
        </div>
      </div>
    </div>
  );
}
