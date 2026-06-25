"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useSubscription } from "@/components/subscription/SubscriptionContext";
import { usePathname } from "next/navigation";
import styles from "./PlanStatusCard.module.css";

export default function PlanStatusCard() {
  const { planData, loading, loadPlanData } = useSubscription();
  const pathname = usePathname();

  useEffect(() => {
    // Refresh plan data whenever user navigates to a new page
    console.log('[PlanStatusCard] User navigated to:', pathname);
    loadPlanData();
  }, [pathname, loadPlanData]);

  useEffect(() => {
    // Also refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[PlanStatusCard] Tab became visible, refreshing plan data...');
        loadPlanData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadPlanData]);

  const displayName = planData?.displayName || null;
  const theme = displayName?.toLowerCase().includes("smart") ? "smart" : "core";
  const isTopTier = theme === "smart";

  if (loading) {
    return (
      <div className={`${styles.pill} ${styles[`theme-${theme}`]}`}>
        <div className={styles.pillSkeleton} />
      </div>
    );
  }

  if (!planData) {
    return (
      <div className={`${styles.pill} ${styles["theme-core"]}`}>
        <div className={styles.pillContent}>
          <AlertCircle size={14} />
          <span className={styles.pillText}>No Active Plan</span>
        </div>
        <Link href="/subscription" className={styles.pillButton}>
          Browse
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.pill} ${styles[`theme-${theme}`]}`}>
      <div className={styles.pillContent}>
        <span className={styles.pillText}>
          <strong>{displayName}</strong>
        </span>
      </div>
      {!isTopTier && (
        <Link href="/subscription" className={styles.pillButton}>
          Upgrade Plan
        </Link>
      )}
    </div>
  );
}
