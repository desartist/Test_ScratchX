"use client";
import React from "react";
import Link from "next/link";
import styles from "./page.module.css";

function QRIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="5" y="5" width="4" height="4" fill="white" />
      <rect x="15" y="5" width="4" height="4" fill="white" />
      <rect x="5" y="15" width="4" height="4" fill="white" />
      <rect x="13" y="13" width="4" height="4" rx="0.5" />
      <rect x="18" y="13" width="3" height="3" rx="0.5" />
      <rect x="13" y="18" width="3" height="3" rx="0.5" />
      <rect x="18" y="18" width="3" height="3" rx="0.5" />
    </svg>
  );
}

function CouponIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-4V9z" />
      <line x1="12" y1="9" x2="12" y2="10" />
      <line x1="12" y1="14" x2="12" y2="15" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <span className={styles.logoText}>Scratch</span>
        <span className={styles.logoX}>✕</span>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <h1 className={styles.headline}>
          Set up your store<br />in minutes
        </h1>
        <p className={styles.subtitle}>
          Create campaigns, engage customers and turn walk-in customers into repeat buyers.
        </p>
      </div>

      {/* CTA */}
      <div className={styles.ctaArea}>
        <Link href="/auth/register" className={styles.ctaButton}>
          <span>Get Started</span>
          <ArrowRightIcon />
        </Link>
        <p className={styles.hint}>Takes less than 2 minutes</p>
      </div>

      {/* Feature Cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIconWrap}>
            <QRIcon />
          </div>
          <p className={styles.cardLabel}>Smart QR<br />Coupons</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIconWrap}>
            <CouponIcon />
          </div>
          <p className={styles.cardLabel}>Easy Campaign<br />Creation</p>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© Copyright 2026 | Powered by Desartist</p>
      </footer>
    </div>
  );
}
