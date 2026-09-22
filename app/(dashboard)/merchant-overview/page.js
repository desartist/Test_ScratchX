"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SmartDashboard from "@/components/dashboards/SmartDashboard";
import DistributorDashboard from "@/components/dashboards/DistributorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import PreSubscriptionDashboard from "@/components/dashboards/PreSubscriptionDashboard";
import { useDashboardQuery } from "@/hooks/queries/useDashboardQuery";
import DashboardSkeleton from "@/components/dashboard/smart/DashboardSkeleton";
import styles from "./merchant.module.css";

export default function MerchantOverviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [cookieHint, setCookieHint] = useState({ role: null, hasSub: true });

  // Set mounted flag to prevent hydration mismatch, and pick up the role /
  // subscription hints the login flow stored in cookies. Read here rather than
  // during render because document.cookie isn't available server-side.
  useEffect(() => {
    setMounted(true);
    const read = (name) =>
      document.cookie
        .split("; ")
        .find((c) => c.startsWith(name + "="))
        ?.split("=")[1] || null;
    setCookieHint({ role: read("accountRole"), hasSub: read("merchantHasSub") !== "0" });
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

  // Which dashboard to show needs the role and (for merchants) whether they
  // have a plan. Waiting for /api/dashboard to answer that meant a full-page
  // grey skeleton on slow connections. Both facts are already in cookies that
  // login writes (`accountRole`, `merchantHasSub`), so read those for the
  // first paint and let the API response take over the moment it lands.
  // They only pick which shell to draw — every route still authorises on the
  // server, so a tampered cookie just renders the wrong empty frame.
  const role = dashboardJson?.role || cookieHint.role || null;
  const hasSubscription = dashboardData
    ? ["active", "trial", "past_due"].includes(dashboardData?.subscription?.status)
    : cookieHint.hasSub;
  const userRole = role;

  // Redirect merchants with zero stores into onboarding, same as the old
  // fetch-effect used to — now reacting to the shared query result instead.
  // Scoped to Merchant only: Super_Admin/Distributor accounts naturally have
  // zero stores of their own and should never be pushed into store setup.
  useEffect(() => {
    if (mounted && dashboardJson && dashboardJson.role === "Merchant" && totalStores === 0) {
      router.push("/stores/create");
    }
  }, [mounted, dashboardJson, totalStores, router]);

  // Only block when we genuinely don't know which dashboard to draw (no role
  // from the API *or* the cookie). With a role in hand the real shell renders
  // straight away and shimmers just the values that are still in flight.
  if (loading && !role) {
    return (
      <div className={styles.container}>
        <DashboardSkeleton />
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

  if (!loading && !dashboardData) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Dashboard Unavailable</h2>
          <p>Please refresh the page or contact support.</p>
        </div>
      </div>
    );
  }

  // Pre-subscription: has stores but no plan purchased yet. Only decide this
  // once the real data is in — `totalStores` is 0 while loading, which would
  // otherwise flip the shell back and forth.
  const shouldShowPreSubscriptionDashboard =
    !!dashboardData && !hasSubscription && totalStores > 0;

  return (
    <div className={styles.container}>
      {shouldShowPreSubscriptionDashboard ? (
        <PreSubscriptionDashboard data={dashboardData} />
      ) : (
        <>
          {/* All subscribed merchants use SmartDashboard (handles Core + Smart) */}
          {/* SmartDashboard fetches its own data and renders its structure
              immediately, so it can mount before /api/dashboard resolves.
              The others take `data` as a prop and wait for it. */}
          {userRole === "Merchant" && hasSubscription && <SmartDashboard />}
          {userRole === "Merchant" && !hasSubscription && dashboardData && (
            <PreSubscriptionDashboard data={dashboardData} />
          )}
          {userRole === "Distributor" && dashboardData && (
            <DistributorDashboard data={dashboardData} />
          )}
          {userRole === "Super_Admin" && dashboardData && (
            <AdminDashboard data={dashboardData} />
          )}
        </>
      )}
    </div>
  );
}
