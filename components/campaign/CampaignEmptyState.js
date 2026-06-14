"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, Zap, Shield, ArrowRight, Star } from "lucide-react";
import styles from "./CampaignEmptyState.module.css";

const CAMPAIGN_BENEFITS = [
  "Reward Customers",
  "Increase Engagement",
  "Drive Repeat Purchases",
  "Real-time Tracking",
];

const PLAN_FEATURES = [
  { icon: <Zap size={18} />, text: "Launch unlimited campaigns" },
  { icon: <Star size={18} />, text: "Digital scratch card rewards" },
  { icon: <Shield size={18} />, text: "QR code generation & tracking" },
  { icon: <CheckCircle2 size={18} />, text: "Real-time analytics dashboard" },
];

function NoPlanState() {
  const router = useRouter();

  return (
    <div className={styles.wrapper}>
      <section className={styles.noPlanCard}>
        <div className={styles.noPlanBadge}>
          <Sparkles size={14} />
          Subscription Required
        </div>

        <div className={styles.noPlanIllustration}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.illustrationSvg}>
            <rect x="8" y="16" width="48" height="32" rx="6" stroke="currentColor" strokeWidth="3" />
            <path d="M8 26h48" stroke="currentColor" strokeWidth="3" />
            <rect x="16" y="34" width="12" height="6" rx="2" fill="currentColor" opacity="0.5" />
            <rect x="32" y="34" width="16" height="6" rx="2" fill="currentColor" opacity="0.25" />
          </svg>
        </div>

        <h1 className={styles.noPlanHeadline}>Activate a Plan to Start</h1>
        <p className={styles.noPlanSubtext}>
          You need an active subscription to create and run campaigns. Choose a
          plan and start rewarding your customers today.
        </p>

        <ul className={styles.noPlanFeatures}>
          {PLAN_FEATURES.map((f, i) => (
            <li key={i} className={styles.noPlanFeature}>
              <span className={styles.noPlanFeatureIcon}>{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <div className={styles.noPlanActions}>
          <button
            type="button"
            className={styles.noPlanPrimaryCta}
            onClick={() => router.push("/billing/plans")}
          >
            View Plans &amp; Pricing
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className={styles.noPlanSecondaryCta}
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </section>
    </div>
  );
}

function ReadyState() {
  const router = useRouter();

  return (
    <div className={styles.wrapper}>
      <section className={styles.card}>
        <div className={styles.illustration} aria-hidden="true">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.illustrationSvg}
          >
            <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="3" opacity="0.35" />
            <circle cx="32" cy="32" r="13" stroke="currentColor" strokeWidth="3" opacity="0.6" />
            <circle cx="32" cy="32" r="4" fill="currentColor" />
            <path
              d="M32 4v8M32 52v8M4 32h8M52 32h8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className={styles.headline}>Your store is ready!</h1>
        <p className={styles.subtext}>
          Launch your first campaign and start engaging customers with ScratchX.
        </p>

        <ul className={styles.benefits}>
          {CAMPAIGN_BENEFITS.map((benefit) => (
            <li key={benefit} className={styles.benefit}>
              <CheckCircle2 size={18} className={styles.benefitIcon} aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryCta}
            onClick={() => router.push("/campaign/new")}
          >
            Create My First Campaign
          </button>
          <button
            type="button"
            className={styles.secondaryCta}
            onClick={() => router.push("/dashboard")}
          >
            Skip for now
          </button>
        </div>
      </section>
    </div>
  );
}

export default function CampaignEmptyState({ hasActivePlan = true }) {
  if (!hasActivePlan) return <NoPlanState />;
  return <ReadyState />;
}
