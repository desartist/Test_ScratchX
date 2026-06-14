"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Gift, ArrowRight } from "lucide-react";
import styles from "./SettingsSubscriptionCard.module.css";

export default function SettingsSubscriptionCard() {
  const router = useRouter();
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/subscription/current", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject("Failed"))
      .then((data) => setSubData(data))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Current Subscription</h3>
        <p style={{ textAlign: "center", color: "#6c757d" }}>Loading...</p>
      </div>
    );
  }

  const subscription = subData?.subscription;
  if (error || !subscription) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyStateContainer}>
          <div className={styles.emptyStateIcon}>
            <Gift size={48} />
          </div>
          <h3 className={styles.emptyStateTitle}>No Active Subscription</h3>
          <p className={styles.emptyStateDescription}>
            Get started with a ScratchX subscription and unlock powerful features for your business.
          </p>
          <div className={styles.benefitsPreview}>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>✨</span>
              <span className={styles.benefitText}>Unlimited Campaigns</span>
            </div>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>🎯</span>
              <span className={styles.benefitText}>Advanced Analytics</span>
            </div>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>🚀</span>
              <span className={styles.benefitText}>Priority Support</span>
            </div>
          </div>
          <button className={styles.buySubscriptionBtn} onClick={() => router.push('/subscription')}>
            <Gift size={18} />
            Buy Subscription Now
            <ArrowRight size={16} />
          </button>
          <p className={styles.emptyStateFooter}>
            Start your free trial today. No credit card required.
          </p>
        </div>
      </div>
    );
  }

  const planName = subData?.displayName || "Unknown Plan";
  const planStatus = subscription.status?.charAt(0).toUpperCase() + subscription.status?.slice(1) || "Active";
  const isTopTier = planName.toLowerCase().includes("smart");
  const limits = subData?.limits;

  const formatLimit = (value) => {
    if (value === -1 || value == null) return "Unlimited";
    return value.toLocaleString();
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Current Subscription</h3>
      <div className={styles.planSection}>
        <div className={styles.planName}>{planName}</div>
        <div className={`${styles.planStatus} ${styles[`status-${subscription.status}`]}`}>
          {planStatus}
        </div>
      </div>
      <div className={styles.features}>
        <div className={styles.feature}>
          ✓ {formatLimit(limits?.maxCampaigns)} Campaigns
        </div>
        <div className={styles.feature}>
          ✓ {formatLimit(limits?.maxStores)} Stores
        </div>
        <div className={styles.feature}>
          ✓ Unlimited Scratches
        </div>
      </div>
      {!isTopTier && (
        <button
          className={styles.upgradeBtn}
          onClick={() => router.push('/subscription')}
        >
          <Zap size={18} /> Upgrade Plan
        </button>
      )}
    </div>
  );
}
