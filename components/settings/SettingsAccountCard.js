"use client";
import React from "react";
import { useSubscriptionCurrentQuery } from "@/hooks/queries/useSubscriptionQuery";
import styles from "./SettingsAccountCard.module.css";

export default function SettingsAccountCard({ merchant }) {
  const role = merchant?.role || "Merchant";
  const hasSubscription = role === "Merchant";

  // Shares the same cached response as SettingsSubscriptionCard,
  // SettingsProfileCard, and every other subscription/current consumer.
  const { data, isPending: loadingSubscription } = useSubscriptionCurrentQuery({
    enabled: hasSubscription,
  });
  const planInfo = data?.subscription
    ? { displayName: data.displayName, status: data.subscription.status }
    : null;

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRole = (role) => role.replace(/_/g, " ");

  const getPlanName = () => {
    if (loadingSubscription) return "Loading...";
    return planInfo?.displayName || "No Active Plan";
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.title}>Account Information</span>
      </div>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.label}>Account ID</span>
          <span className={styles.value}>
            {merchant?.merchantId || merchant?._id?.slice(0, 8).toUpperCase() || "N/A"}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.label}>Account Type</span>
          <span className={styles.value}>{formatRole(role)}</span>
        </div>
        {hasSubscription && (
          <div className={styles.infoItem}>
            <span className={styles.label}>Subscription Plan</span>
            <span className={styles.value}>{getPlanName()}</span>
          </div>
        )}
        <div className={styles.infoItem}>
          <span className={styles.label}>Account Created</span>
          <span className={styles.value}>
            {formatDate(merchant?.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
