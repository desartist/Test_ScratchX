"use client";

import React from "react";
import { AlertCircle, ScanLine, Users, TrendingUp } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useStoreAnalyticsQuery } from "@/hooks/queries/useStoreAnalyticsQuery";
import LoadingState from "@/components/common/LoadingState";
import styles from "./store-analytics.module.css";

export default function StoreAnalyticsPage() {
  const { account } = useAuthContext();
  const { data: analytics, isPending: loading, error: queryError } = useStoreAnalyticsQuery();
  const error = queryError ? queryError.message : null;

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingState message="Loading analytics..." />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{error || "Unable to load analytics."}</p>
        </div>
      </div>
    );
  }

  // The API already returns a smaller shape for Store_Staff (analytics:read)
  // vs Store_Manager (analytics:own_store) — uniqueCustomers/storeName are
  // only present for Manager.
  const isManager = account?.role === "Store_Manager";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <p className={styles.pageSubtitle}>
          {isManager ? "Performance for your store" : "Basic activity for your store"}
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <ScanLine size={20} />
          </div>
          <span className={styles.cardValue}>{analytics.scans}</span>
          <span className={styles.cardLabel}>Total Scans</span>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <TrendingUp size={20} />
          </div>
          <span className={styles.cardValue}>{analytics.used}</span>
          <span className={styles.cardLabel}>Cards Used</span>
        </div>

        {isManager && (
          <div className={styles.card}>
            <div className={styles.cardIcon}>
              <Users size={20} />
            </div>
            <span className={styles.cardValue}>{analytics.uniqueCustomers}</span>
            <span className={styles.cardLabel}>Unique Customers</span>
          </div>
        )}
      </div>
    </div>
  );
}
