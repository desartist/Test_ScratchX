"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SmartDashboard from "@/components/dashboards/SmartDashboard";
import DistributorDashboard from "@/components/dashboards/DistributorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import PreSubscriptionDashboard from "@/components/dashboards/PreSubscriptionDashboard";
import { useDashboardQuery } from "@/hooks/queries/useDashboardQuery";
import styles from "./merchant.module.css";

export default function MerchantOverviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: dashboardJson,
    isPending: queryLoading,
    error: queryError,
  } = useDashboardQuery();

  const loading = !mounted || queryLoading;
  const error = queryError ? queryError.message || "Failed to load dashboard" : null;
  const totalStores = dashboardJson?.data?.metrics?.totalStores || 0;
  const dashboardData = mounted && dashboardJson && totalStores > 0 ? dashboardJson.data : null;
  const userRole = dashboardData ? dashboardJson.role : null;

  // Redirect merchants with zero stores into onboarding, same as the old
  // fetch-effect used to — now reacting to the shared query result instead.
  useEffect(() => {
    if (mounted && dashboardJson && totalStores === 0) {
      router.push("/stores/create");
    }
  }, [mounted, dashboardJson, totalStores, router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button
            onClick={() => router.refresh()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Dashboard Unavailable</h2>
          <p>Please refresh the page or contact support.</p>
        </div>
      </div>
    );
  }

  const hasSubscription = ["active", "trial", "past_due"].includes(
    dashboardData?.subscription?.status,
  );

  // Pre-subscription: has stores but no plan purchased yet
  const shouldShowPreSubscriptionDashboard = !hasSubscription && totalStores > 0;

  return (
    <div className={styles.container}>
      {shouldShowPreSubscriptionDashboard ? (
        <PreSubscriptionDashboard data={dashboardData} />
      ) : (
        <>
          {/* All subscribed merchants use SmartDashboard (handles Core + Smart) */}
          {userRole === "Merchant" && hasSubscription && <SmartDashboard />}
          {userRole === "Merchant" && !hasSubscription && (
            <PreSubscriptionDashboard data={dashboardData} />
          )}
          {userRole === "Distributor" && (
            <DistributorDashboard data={dashboardData} />
          )}
          {userRole === "SuperAdmin" && <AdminDashboard data={dashboardData} />}
        </>
      )}
    </div>
  );
}
