"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import styles from "./PlanStatusCard.module.css";

export default function PlanStatusCard() {
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/current", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.subscription) setSubData(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayName = subData?.displayName || null;
  const theme = displayName?.toLowerCase().includes("smart") ? "smart" : "core";
  const isTopTier = theme === "smart";

  if (loading) {
    return (
      <div className={`${styles.pill} ${styles[`theme-${theme}`]}`}>
        <div className={styles.pillSkeleton} />
      </div>
    );
  }

  if (!subData) {
    return (
      <div className={`${styles.pill} ${styles["theme-core"]}`}>
        <div className={styles.pillContent}>
          <AlertCircle size={14} />
          <span className={styles.pillText}>No Active Plan</span>
        </div>
        <Link href="/billing/plans" className={styles.pillButton}>
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
        <Link href="/billing/plans" className={styles.pillButton}>
          Upgrade Plan
        </Link>
      )}
    </div>
  );
}
