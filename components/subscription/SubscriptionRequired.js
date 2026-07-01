"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./SubscriptionRequired.module.css";

const BENEFITS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Attract Customers",
    desc: "Get more walk-in customers",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    title: "Boost Engagement",
    desc: "Increase customer interaction",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    ),
    title: "Repeat Sales",
    desc: "Bring customers back",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: "Analytics",
    desc: "Track campaign performance",
  },
];

export default function SubscriptionRequired() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Left — illustration panel */}
        <div className={styles.illustrationPane}>
          <div className={styles.illustrationDots} />
          {/* <div className={styles.illustrationBadge}>
            <span className={styles.badgeDot} />
            QR Scratch Card Platform
          </div> */}
          <Image
            src="/ScratchXCampaign.svg"
            alt="ScratchX Campaign illustration"
            width={260}
            height={260}
            className={styles.illustration}
            priority
          />
          {/* <p className={styles.illustrationTitle}>Powered by ScratchX</p> */}
        </div>

        {/* Right — content panel */}
        <div className={styles.contentPane}>
          {/* <p className={styles.pageLabel}>Campaigns</p> */}

          <h1 className={styles.heading}>
            Launch Your First<br />
            <span className={styles.headingAccent}>ScratchX Campaign</span>
          </h1>

          <p className={styles.description}>
            Create QR-based scratch reward campaigns that increase repeat
            customers, boost engagement, and drive more sales for your store.
          </p>
             <div className={styles.notice}>
            <svg className={styles.noticeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className={styles.noticeText}>
              <strong>No active subscription found.</strong>{" "}
              Choose a plan to start creating campaigns.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href="/subscription" className={styles.primaryBtn}>
              Choose a Plan
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </Link>
            {/* <Link href="/dashboard" className={styles.secondaryBtn}>
              Back to Dashboard
            </Link> */}
          </div>
          {/* <div className={styles.benefits}>
            {BENEFITS.map((b) => (
              <div key={b.title} className={styles.benefit}>
                <div className={styles.benefitIcon}>{b.icon}</div>
                <div className={styles.benefitText}>
                  <span className={styles.benefitTitle}>{b.title}</span>
                  <span className={styles.benefitDesc}>{b.desc}</span>
                </div>
              </div>
            ))}
          </div> */}

         
        </div>

      </div>
    </div>
  );
}
