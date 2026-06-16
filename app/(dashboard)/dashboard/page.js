"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import SmartDashboard from "@/components/dashboards/SmartDashboard";
import DistributorDashboard from "@/components/dashboards/DistributorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import PreSubscriptionDashboard from "@/components/dashboards/PreSubscriptionDashboard";
import styles from "./page.module.css";

function WelcomeOnboarding() {
  return (
    <div className={styles.onboarding}>
      <div className={styles.onboardingHero}>
        <div className={styles.onboardingBadge}>
          <span className={styles.onboardingBadgeDot} />
          QR Scratch Card Platform
        </div>
        <h1 className={styles.onboardingHeadline}>
          Set up your<br />store<br />
          <span className={styles.onboardingAccent}>in minutes</span>
        </h1>
        <p className={styles.onboardingSubtitle}>
          Create campaigns, engage customers and turn walk-in customers into repeat buyers.
        </p>
      </div>

      <div className={styles.onboardingCta}>
        <Link href="/stores/create" className={styles.onboardingBtn}>
          <span>Get Started</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </Link>
        <p className={styles.onboardingHint}>Takes less than 2 minutes</p>
      </div>

      <div className={styles.onboardingCards}>
        <div className={styles.onboardingCard}>
          <div className={styles.onboardingCardIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="8" height="8" rx="1.5"/>
              <rect x="13" y="3" width="8" height="8" rx="1.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5"/>
              <rect x="5" y="5" width="4" height="4" fill="white"/>
              <rect x="15" y="5" width="4" height="4" fill="white"/>
              <rect x="5" y="15" width="4" height="4" fill="white"/>
              <rect x="13" y="13" width="4" height="4" rx="0.5"/>
              <rect x="18" y="13" width="3" height="3" rx="0.5"/>
              <rect x="13" y="18" width="3" height="3" rx="0.5"/>
              <rect x="18" y="18" width="3" height="3" rx="0.5"/>
            </svg>
          </div>
          <p className={styles.onboardingCardLabel}>Smart QR<br />Coupons</p>
        </div>
        <div className={styles.onboardingCard}>
          <div className={styles.onboardingCardIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-4V9z"/>
              <line x1="12" y1="9" x2="12" y2="10"/>
              <line x1="12" y1="14" x2="12" y2="15"/>
            </svg>
          </div>
          <p className={styles.onboardingCardLabel}>Easy Campaign<br />Creation</p>
        </div>
      </div>

      <footer className={styles.onboardingFooter}>
        <p>© Copyright 2026 | Powered by Desartist</p>
      </footer>
    </div>
  );
}

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

  // Fresh account with no stores → show onboarding
  if (totalStores === 0 && userRole === "Merchant") {
    return <WelcomeOnboarding />;
  }

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
