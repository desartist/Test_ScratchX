'use client'
import React from 'react';;

import styles from './ScratchInventoryCard.module.css';

export default function ScratchInventoryCard() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Scratch Inventory</h3>
        <span className={styles.badge}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
             <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          18% this week
        </span>
      </div>
      
      <div className={styles.statsRow}>
        <div className={styles.mainStat}>
          <div className={styles.mainValue}>2,580</div>
          <div className={styles.mainLabel}>Scratches remaining</div>
        </div>
        <div className={styles.subStats}>
          <div className={styles.subStat}>
            <div className={styles.subValue}>7,420</div>
            <div className={styles.subLabel}>Used</div>
          </div>
          <div className={styles.subStat}>
            <div className={styles.subValue}>10,000</div>
            <div className={styles.subLabel}>Total</div>
          </div>
        </div>
      </div>

      <button className={styles.buyBtn}>
        Buy More Scratches
      </button>
    </div>
  );
}
