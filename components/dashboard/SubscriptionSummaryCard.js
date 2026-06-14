"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, AlertCircle } from "lucide-react";
import styles from "./SubscriptionSummaryCard.module.css";

export default function SubscriptionSummaryCard() {
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/subscription/current", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch subscription");
        }

        const data = await response.json();
        setSubscription(data.subscription);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <div className={styles.card}>
        <p style={{ textAlign: "center", color: "#6c757d" }}>Loading subscription...</p>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <AlertCircle size={32} />
          <h3>No Active Subscription</h3>
          <p>Upgrade to unlock more features</p>
          <button
            className={styles.upgradeBtn}
            onClick={() => router.push('/subscription')}
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  const plan = subscription.planId;
  const planName = plan?.displayName || plan?.name || "Unknown Plan";
  const planStatus = subscription.status?.charAt(0).toUpperCase() + subscription.status?.slice(1) || "Active";
  const maxCampaigns = plan?.limits?.maxCampaigns || 0;
  const maxStores = plan?.limits?.maxStores || 0;
  const isTopTier = (plan?.name || "").toLowerCase().includes("smart");

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.planInfo}>
          <h3 className={styles.planName}>{planName}</h3>
          <span className={`${styles.status} ${styles[`status-${subscription.status}`]}`}>
            {planStatus}
          </span>
        </div>
        <TrendingUp size={24} className={styles.icon} />
      </div>

      <div className={styles.usageSection}>
        <div className={styles.usageItem}>
          <div className={styles.usageLabel}>Campaigns</div>
          <div className={styles.usageBar}>
            <div className={styles.usageValue}>
              {maxCampaigns === -1 ? "Unlimited" : `0 / ${maxCampaigns}`}
            </div>
          </div>
        </div>
        <div className={styles.usageItem}>
          <div className={styles.usageLabel}>Stores</div>
          <div className={styles.usageBar}>
            <div className={styles.usageValue}>
              {maxStores === -1 ? "Unlimited" : `0 / ${maxStores}`}
            </div>
          </div>
        </div>
      </div>

      {!isTopTier && (
        <button
          className={styles.upgradeBtn}
          onClick={() => router.push('/subscription')}
        >
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
