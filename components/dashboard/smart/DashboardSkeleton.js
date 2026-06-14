import React from "react";
import styles from "./DashboardSkeleton.module.css";

export default function DashboardSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading dashboard">
      {/* Header bar */}
      <div className={styles.headerRow}>
        <div className={`${styles.block} ${styles.avatar}`} />
        <div className={styles.headerText}>
          <div className={`${styles.block} ${styles.lineLg}`} />
          <div className={`${styles.block} ${styles.lineSm}`} />
        </div>
      </div>

      {/* Hero block */}
      <div className={`${styles.block} ${styles.hero}`} />

      {/* 2x2 KPI */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.block} ${styles.kpi}`} />
        <div className={`${styles.block} ${styles.kpi}`} />
        <div className={`${styles.block} ${styles.kpi}`} />
        <div className={`${styles.block} ${styles.kpi}`} />
      </div>

      {/* 2 card rows */}
      <div className={`${styles.block} ${styles.card}`} />
      <div className={`${styles.block} ${styles.card}`} />

      {/* Chart blocks */}
      <div className={`${styles.block} ${styles.chart}`} />
      <div className={`${styles.block} ${styles.chart}`} />
    </div>
  );
}
