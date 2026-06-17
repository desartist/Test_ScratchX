"use client";

import React from "react";
import Link from "next/link";
import styles from "./WelcomeOnboarding.module.css";

export default function WelcomeOnboarding() {
  return (
    <div className={styles.onboarding}>
      <div className={styles.hero}>
        {/* <div className={styles.badge}>
          <span className={styles.badgeDot} />
          QR Scratch Card Platform
        </div> */}
        <h1 className={styles.headline}>
          Set up your<br />store<br />
          <span className={styles.accent}>in minutes</span>
        </h1>
        <p className={styles.subtitle}>
          Create campaigns, engage customers and turn walk-in customers into repeat buyers.
        </p>
      </div>

      <div className={styles.cta}>
        <Link href="/stores/create" className={styles.btn}>
          <span>Get Started</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </Link>
        <p className={styles.hint}>Takes less than 2 minutes</p>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="8" height="8" rx="1.5"/>
              <rect x="13" y="3" width="8" height="8" rx="1.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5"/>
              <rect x="5" y="5" width="4" height="4" fill="white"/>
              <rect x="15" y="5" width="4" height="4" fill="white"/>
              <rect x="5" y="15" width="4" height="4" fill="white"/>
              <rect x="13" y="13" width="4" height="4" rx="0.5"/>
              <rect x="18" y="13" width="3" height="3" rx="0.5"/>
              <rect x="13" y="18" width="3" height="3" rx="0.5"/>
              <rect x="18" y="18" width="3" height="3" rx="0.5"/>
            </svg>
          </div>
          <p className={styles.cardLabel}>Smart QR<br />Coupons</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-4V9z"/>
              <line x1="12" y1="9" x2="12" y2="10"/>
              <line x1="12" y1="14" x2="12" y2="15"/>
            </svg>
          </div>
          <p className={styles.cardLabel}>Easy Campaign<br />Creation</p>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© Copyright 2026 | Powered by Desartist</p>
      </footer>
    </div>
  );
}
