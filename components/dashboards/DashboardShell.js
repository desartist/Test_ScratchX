"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/components/auth/AuthContext";
import OverviewMetrics from "./widgets/OverviewMetrics";
import SubscriptionStatus from "./widgets/SubscriptionStatus";
import CampaignPerformance from "./widgets/CampaignPerformance";
import styles from "./RetailerDashboard.module.css";

export default function DashboardShell() {
  const { account } = useAuthContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/retailer", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard");
        }

        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
          setError(null);
        } else {
          setError(result.error || "Failed to load dashboard");
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Error loading dashboard. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    if (account?.id) {
      fetchDashboard();
    }
  }, [account?.id]);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.errorContainer}>
          <h3 className={styles.errorTitle}>Error Loading Dashboard</h3>
          <p className={styles.errorMessage}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isSingleStore = dashboardData.isSingleStore;

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>Dashboard</h1>
        <p className={styles.dashboardSubtitle}>
          {isSingleStore ? "Single Store Overview" : "Multi-Store Overview"}
        </p>
      </div>

      {/* Main Content */}
      <div className={styles.dashboardContent}>
        {/* Subscription Status */}
        <SubscriptionStatus
          subscription={dashboardData.subscription}
          scratchEntitlement={dashboardData.scratchEntitlement}
        />

        {/* Overview Metrics */}
        <OverviewMetrics metrics={dashboardData.metrics} isSingleStore={isSingleStore} />

        {/* Campaign Performance */}
        <CampaignPerformance
          campaigns={dashboardData.campaigns}
          isSingleStore={isSingleStore}
        />

        {/* Store Section (Multi-Store Only) */}
        {!isSingleStore && dashboardData.stores && (
          <div className={styles.storeSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Store Performance</h3>
              <a href="/stores" className={styles.viewAllLink}>
                View all
              </a>
            </div>
            <div className={styles.storesGrid}>
              {dashboardData.stores.map((store) => (
                <div key={store._id} className={styles.storeCard}>
                  <h4 className={styles.storeName}>{store.name}</h4>
                  <p className={styles.storeAddress}>{store.address}</p>
                  <div className={styles.storeMetrics}>
                    <div className={styles.storeMetric}>
                      <span className={styles.metricLabel}>Campaigns</span>
                      <span className={styles.metricValue}>
                        {store.campaignCount}
                      </span>
                    </div>
                    <div className={styles.storeMetric}>
                      <span className={styles.metricLabel}>Remaining</span>
                      <span className={styles.metricValue}>
                        {store.scratchRemaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scratch Analytics */}
        {dashboardData.scratch && (
          <div className={styles.scratchSection}>
            <h3 className={styles.sectionTitle}>Scratch Analytics</h3>
            <div className={styles.scratchGrid}>
              <div className={styles.scratchCard}>
                <span className={styles.scratchLabel}>Total Allocated</span>
                <span className={styles.scratchValue}>
                  {dashboardData.scratch.totalAllocated.toLocaleString()}
                </span>
              </div>
              <div className={styles.scratchCard}>
                <span className={styles.scratchLabel}>Distributed</span>
                <span className={styles.scratchValue}>
                  {dashboardData.scratch.distributed.toLocaleString()}
                </span>
              </div>
              <div className={styles.scratchCard}>
                <span className={styles.scratchLabel}>Claimed</span>
                <span className={styles.scratchValue}>
                  {dashboardData.scratch.claimed.toLocaleString()}
                </span>
              </div>
              <div className={styles.scratchCard}>
                <span className={styles.scratchLabel}>Remaining</span>
                <span className={styles.scratchValue}>
                  {dashboardData.scratch.remaining.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
