"use client";

import React from "react";
import { Zap, AlertCircle, TrendingUp, Clock } from "lucide-react";
import styles from "./SubscriptionStatus.module.css";

export default function SubscriptionStatus({ subscription, scratchEntitlement }) {
  if (!subscription) {
    return (
      <div className={`${styles.card} ${styles.skeleton}`} />
    );
  }

  const planTheme = subscription.planName?.toLowerCase().includes("smart")
    ? "smart"
    : "core";

  const getUsagePercent = (used, limit) => {
    if (limit === -1 || limit === "Unlimited") return 0;
    return Math.round((used / limit) * 100);
  };

  const campaignPercent = getUsagePercent(
    subscription.usage.campaigns,
    subscription.limits.campaigns
  );
  const storePercent = getUsagePercent(
    subscription.usage.stores,
    subscription.limits.stores
  );

  // Check if unlimited scratches are active
  const hasUnlimitedScratches =
    scratchEntitlement?.status === "unlimited" &&
    scratchEntitlement?.daysRemaining > 0;

  const scratchPercent = hasUnlimitedScratches
    ? 0
    : getUsagePercent(
        subscription.usage.scratchCards,
        subscription.limits.scratchCards
      );

  const showWarning =
    campaignPercent >= 80 || storePercent >= 80 || scratchPercent >= 80;

  const showScratchWarning =
    hasUnlimitedScratches && scratchEntitlement?.warningLevel !== null;

  return (
    <div className={`${styles.container}`}>
      <div className={`${styles.card} ${styles[`theme-${planTheme}`]}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.planName}>{subscription.displayName}</h2>
            <p className={styles.status}>
              <Zap size={14} /> Active
            </p>
          </div>
          {subscription.daysRemaining <= 7 && (
            <div className={styles.expiringSoon}>
              {subscription.daysRemaining} days left
            </div>
          )}
        </div>

        <div className={styles.usageGrid}>
          <div className={styles.usageItem}>
            <div className={styles.usageHeader}>
              <span className={styles.usageLabel}>Campaigns</span>
              <span className={styles.usageValue}>
                {subscription.usage.campaigns}/{subscription.limits.campaigns === -1 ? "∞" : subscription.limits.campaigns}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progress} ${
                  campaignPercent >= 80
                    ? styles.warning
                    : campaignPercent >= 50
                      ? styles.caution
                      : styles.safe
                }`}
                style={{
                  width: `${Math.min(campaignPercent, 100)}%`,
                }}
              />
            </div>
            <span className={styles.percent}>{campaignPercent}% used</span>
          </div>

          <div className={styles.usageItem}>
            <div className={styles.usageHeader}>
              <span className={styles.usageLabel}>Stores</span>
              <span className={styles.usageValue}>
                {subscription.usage.stores}/{subscription.limits.stores === -1 ? "∞" : subscription.limits.stores}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progress} ${
                  storePercent >= 80
                    ? styles.warning
                    : storePercent >= 50
                      ? styles.caution
                      : styles.safe
                }`}
                style={{
                  width: `${Math.min(storePercent, 100)}%`,
                }}
              />
            </div>
            <span className={styles.percent}>{storePercent}% used</span>
          </div>

          <div className={styles.usageItem}>
            <div className={styles.usageHeader}>
              <span className={styles.usageLabel}>Scratches</span>
              <span className={styles.usageValue}>
                {hasUnlimitedScratches
                  ? "Unlimited"
                  : `${subscription.usage.scratchCards.toLocaleString()}/${subscription.limits.scratchCards === -1 ? "∞" : subscription.limits.scratchCards.toLocaleString()}`}
              </span>
            </div>
            {hasUnlimitedScratches ? (
              <>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progress} ${styles.safe}`}
                    style={{
                      width: `${Math.max(
                        (scratchEntitlement.daysRemaining / 90) * 100,
                        5
                      )}%`,
                    }}
                  />
                </div>
                <span className={styles.percent}>
                  {scratchEntitlement.daysRemaining} days remaining
                </span>
              </>
            ) : (
              <>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progress} ${
                      scratchPercent >= 80
                        ? styles.warning
                        : scratchPercent >= 50
                          ? styles.caution
                          : styles.safe
                    }`}
                    style={{
                      width: `${Math.min(scratchPercent, 100)}%`,
                    }}
                  />
                </div>
                <span className={styles.percent}>{scratchPercent}% used</span>
              </>
            )}
          </div>
        </div>

        {showScratchWarning && (
          <div className={styles.warningBox}>
            <Clock size={16} />
            <span>
              {scratchEntitlement.warningLevel === "critical"
                ? "Your scratches expire tomorrow!"
                : scratchEntitlement.warningLevel === "high"
                  ? "Your scratches expire in 3 days."
                  : scratchEntitlement.warningLevel === "medium"
                    ? "Your scratches expire in 7 days."
                    : "Your scratches expire in 15 days. Renew now!"}
            </span>
          </div>
        )}

        {showWarning && !showScratchWarning && (
          <div className={styles.warningBox}>
            <AlertCircle size={16} />
            <span>
              You're approaching your plan limits. Consider upgrading to continue.
            </span>
          </div>
        )}

        <a href="/billing/plans" className={styles.upgradeButton}>
          <TrendingUp size={16} />
          View Plans
        </a>
      </div>
    </div>
  );
}
