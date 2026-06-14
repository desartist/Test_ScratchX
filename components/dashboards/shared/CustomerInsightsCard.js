'use client'
import React from 'react';;

import styles from './CustomerInsightsCard.module.css';

export default function CustomerInsightsCard() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Customer Insights</h3>
        <div className={styles.dateSelector}>
          Last 7 Days
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <div className={styles.statTop}>
            <span className={styles.statValue}>1,268</span>
            <span className={styles.trendUp}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              12%
            </span>
          </div>
          <div className={styles.statLabel}>Total Customers</div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statTop}>
            <span className={styles.statValue}>38%</span>
            <span className={styles.trendUp}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              8%
            </span>
          </div>
          <div className={styles.statLabel}>Repeated Rate</div>
        </div>
      </div>
    </div>
  );
}
