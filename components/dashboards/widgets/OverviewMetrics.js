"use client";

import React from "react";
import {
  TrendingUp,
  ShoppingCart,
  Store,
  Zap,
  Users,
  Gift,
  Percent,
} from "lucide-react";
import styles from "./OverviewMetrics.module.css";

export default function OverviewMetrics({ metrics, isSingleStore = false }) {
  if (!metrics) {
    return (
      <div className={styles.grid}>
        {[...Array(isSingleStore ? 6 : 8)].map((_, i) => (
          <div key={i} className={`${styles.card} ${styles.skeleton}`} />
        ))}
      </div>
    );
  }

  const allMetricCards = [
    {
      icon: ShoppingCart,
      label: "Total Campaigns",
      value: metrics.totalCampaigns || 0,
      color: "blue",
    },
    {
      icon: TrendingUp,
      label: "Active Campaigns",
      value: metrics.activeCampaigns || 0,
      color: "green",
    },
    {
      icon: Store,
      label: "Total Stores",
      value: metrics.totalStores || 0,
      color: "orange",
      multiStoreOnly: true,
    },
    {
      icon: Zap,
      label: "Active Stores",
      value: metrics.activeStores || 0,
      color: "yellow",
      multiStoreOnly: true,
    },
    {
      icon: TrendingUp,
      label: "QR Scans",
      value: (metrics.qrScans || 0).toLocaleString(),
      color: "purple",
    },
    {
      icon: Users,
      label: "Customers Participated",
      value: (metrics.customersParticipated || 0).toLocaleString(),
      color: "pink",
    },
    {
      icon: Gift,
      label: "Coupons Claimed",
      value: (metrics.couponsClaimed || 0).toLocaleString(),
      color: "red",
    },
    {
      icon: Percent,
      label: "Conversion Rate",
      value: `${metrics.conversionRate || 0}%`,
      color: "teal",
    },
  ];

  // Filter metrics: hide store-related metrics for single-store merchants
  const metricCards = isSingleStore
    ? allMetricCards.filter((card) => !card.multiStoreOnly)
    : allMetricCards;

  return (
    <div className={styles.grid}>
      {metricCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`${styles.card} ${styles[`color-${card.color}`]}`}
          >
            <div className={styles.icon}>
              <Icon size={24} />
            </div>
            <div className={styles.content}>
              <div className={styles.label}>{card.label}</div>
              <div className={styles.value}>{card.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
