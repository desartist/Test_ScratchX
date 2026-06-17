"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SubscriptionRequired from "@/components/subscription/SubscriptionRequired";
import styles from "./CampaignEmptyState.module.css";

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

function ReadyState() {
  const router = useRouter();

  return (
    <div className={styles.premiumPage}>
      <div className={styles.premiumCard}>

        {/* Left — illustration */}
        <div className={styles.premiumIllustrationPane}>
          <div className={styles.premiumDots} />
          {/* <div className={styles.premiumBadge}>
            <span className={styles.premiumBadgeDot} />
            QR Scratch Card Platform
          </div> */}
          <Image
            src="/ScratchXCampaign.svg"
            alt="ScratchX Campaign illustration"
            width={260}
            height={260}
            className={styles.premiumIllustration}
            priority
          />
          {/* <p className={styles.premiumIllustrationTitle}>Powered by ScratchX</p> */}
        </div>

        {/* Right — content */}
        <div className={styles.premiumContentPane}>
          {/* <p className={styles.premiumLabel}>Campaigns</p> */}

          <h1 className={styles.premiumHeading}>
            Launch Your First<br />
            <span className={styles.premiumAccent}>ScratchX Campaign</span>
          </h1>

          <p className={styles.premiumDescription}>
            Create QR-based scratch reward campaigns that increase repeat
            customers, boost engagement, and drive more sales for your store.
          </p>
           <div className={styles.premiumNotice}>
            <svg className={styles.premiumNoticeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className={styles.premiumNoticeText}>
              <strong>Your store is ready.</strong>{" "}
              Create your first campaign and start rewarding customers today.
            </p>
          </div>

          <div className={styles.premiumActions}>
            <button
              type="button"
              className={styles.premiumPrimaryBtn}
              onClick={() => router.push("/campaign/new")}
            >
              Create My First Campaign
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button
              type="button"
              className={styles.premiumSecondaryBtn}
              onClick={() => router.push("/dashboard")}
            >
              Skip for now
            </button>
          </div>

          {/* <div className={styles.premiumBenefits}>
            {BENEFITS.map((b) => (
              <div key={b.title} className={styles.premiumBenefit}>
                <div className={styles.premiumBenefitIcon}>{b.icon}</div>
                <div className={styles.premiumBenefitText}>
                  <span className={styles.premiumBenefitTitle}>{b.title}</span>
                  <span className={styles.premiumBenefitDesc}>{b.desc}</span>
                </div>
              </div>
            ))}
          </div> */}

          {/* <div className={styles.premiumNotice}>
            <svg className={styles.premiumNoticeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className={styles.premiumNoticeText}>
              <strong>Your store is ready.</strong>{" "}
              Create your first campaign and start rewarding customers today.
            </p>
          </div>

          <div className={styles.premiumActions}>
            <button
              type="button"
              className={styles.premiumPrimaryBtn}
              onClick={() => router.push("/campaign/new")}
            >
              Create My First Campaign
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button
              type="button"
              className={styles.premiumSecondaryBtn}
              onClick={() => router.push("/dashboard")}
            >
              Skip for now
            </button>
          </div> */}
        </div>

      </div>
    </div>
  );
}

export default function CampaignEmptyState({ hasActivePlan = true }) {
  if (!hasActivePlan) return <SubscriptionRequired />;
  return <ReadyState />;
}
