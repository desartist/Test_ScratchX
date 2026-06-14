"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import SmartDashboard from "@/components/dashboards/SmartDashboard";
import DistributorDashboard from "@/components/dashboards/DistributorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import PreSubscriptionDashboard from "@/components/dashboards/PreSubscriptionDashboard";
import styles from "./page.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { account, token } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (!mounted || !account) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        console.log(
          "[FETCH] Starting dashboard fetch with account:",
          account?.id || account?._id,
        );

        const res = await fetch("/api/dashboard", {
          headers: {
            "x-user-id": account?.id || account?._id,
            "x-user-role": account?.role,
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        console.log("[FETCH] Response status:", res.status);
        const json = await res.json();
        console.log("[FETCH] API Response:", JSON.stringify(json, null, 2));

        if (!json.success) {
          setError(json.error || "Failed to load dashboard");
          return;
        }

        console.log(
          "[FETCH] Setting data with metrics.totalStores:",
          json.data?.metrics?.totalStores,
        );
        setUserRole(json.role);
        setDashboardData(json.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [mounted, account, token]);

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

  // Only render after client mount to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
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
  const totalStores = dashboardData?.metrics?.totalStores || 0;

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
