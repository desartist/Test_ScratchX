// components/dashboard/ScratchAllocationSection.js
"use client";
import React from "react";
import ProgressBar from "./ProgressBar";
import styles from "./ScratchAllocationSection.module.css";

export default function ScratchAllocationSection({
  allocated = 0,
  distributed = 0,
  claimed = 0,
  total = 2000,
  showWarning = false,
}) {
  // Use actual API data without forcing defaults
  const validTotal = total && total > 0 ? total : 1;
  const remaining = validTotal - distributed;

  // Calculate percentage based on distributed (used) scratches
  const percentage = validTotal > 0 ? Math.round((distributed / validTotal) * 100) : 0;

  // Determine status based on remaining scratches
  let status = "normal";
  if (remaining < 200) status = "critical";
  else if (remaining < 500) status = "warning";

  return (
    <div className={styles.section}>
      <ProgressBar current={distributed} total={validTotal} status={status} />

      <div className={styles.statsGrid}>
        <div className={styles.statBlock}>
          <div className={styles.statValue}>{distributed}</div>
          <div className={styles.statLabel}>Distributed</div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statValue}>{allocated}</div>
          <div className={styles.statLabel}>Allocated</div>
        </div>
        <div className={styles.statBlock}>
          <div className={styles.statValue}>{claimed}</div>
          <div className={styles.statLabel}>Claimed</div>
        </div>
      </div>

      {showWarning && (
        <div className={styles.warning}>
          <span className={styles.warningText}>
            ⚠️ Only {remaining} scratches left
          </span>
        </div>
      )}
    </div>
  );
}
