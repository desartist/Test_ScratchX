'use client';

import React from 'react';
import styles from './StoreWelcomeScreen.module.css';

export default function StoreWelcomeScreen({ onGetStarted }) {
  return (
    <div className={styles.welcomeScreen}>
      <div className={styles.welcomeHero}>
        <h1 className={styles.welcomeHeadline}>
          Set up your store<br />
          in minutes
        </h1>
        <p className={styles.welcomeSubtitle}>
          Create campaigns, engage customers and turn<br />
          walk-in customers into repeat buyers.
        </p>
      </div>

      <div className={styles.welcomeCta}>
        <button className={styles.welcomeBtn} onClick={onGetStarted}>
          <span>Get Started</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </button>
        <p className={styles.welcomeHint}>Takes less than 2 minutes</p>
      </div>

      <div className={styles.welcomeCards}>
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeCardIcon}>
            <img src="/qr-icon.svg" alt="QR Code" width="44" height="44" />
          </div>
          <p className={styles.welcomeCardLabel}>Smart QR<br />Coupons</p>
        </div>
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeCardIcon}>
            <img src="/coupon-icon.svg" alt="Coupon" width="44" height="44" />
          </div>
          <p className={styles.welcomeCardLabel}>Easy Campaign<br />Creation</p>
        </div>
      </div>
    </div>
  );
}
