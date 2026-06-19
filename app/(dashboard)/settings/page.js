"use client";

import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import SettingsProfileCard from "@/components/settings/SettingsProfileCard";
import SettingsAccountCard from "@/components/settings/SettingsAccountCard";
import SettingsSubscriptionCard from "@/components/settings/SettingsSubscriptionCard";
import SettingsSecurityCard from "@/components/settings/SettingsSecurityCard";
import SettingsNotificationCard from "@/components/settings/SettingsNotificationCard";
import SettingsBusinessCard from "@/components/settings/SettingsBusinessCard";
import DangerZoneCard from "@/components/settings/DangerZoneCard";
import ActiveSessionsCard from "@/components/settings/ActiveSessionsCard";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { account, logout } = useAuthContext();
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!account?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("/api/merchant", {
          headers: {
            "x-user-id": account.id,
            "x-user-role": account.role || "merchant",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Fetched merchant data:", data);
          setMerchant(data.account || account);
        } else {
          // Fallback to account data
          setMerchant(account);
        }
      } catch (err) {
        console.error("Error fetching merchant data:", err);
        setMerchant(account);
      } finally {
        setLoading(false);
      }
    };

    fetchMerchantData();
  }, [account?.id]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          Loading settings...
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Unable to load settings. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M20 21a8 8 0 1 0-16 0"/>
          </svg>
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Settings & Account</h1>
          <p className={styles.subtitle}>
            Manage your profile, subscription, security and account preferences.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainGrid}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          {/* Profile Card */}
          <SettingsProfileCard merchant={merchant} />

          {/* Business Information Card */}
          <SettingsBusinessCard merchant={merchant} />
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Account Information Card */}
          <SettingsAccountCard merchant={merchant} />

          {/* Subscription Card */}
          <SettingsSubscriptionCard merchant={merchant} />

          {/* Security Card */}
          <SettingsSecurityCard />

          {/* Notification Preferences Card */}
          <SettingsNotificationCard />

          {/* Active Sessions Card */}
          <ActiveSessionsCard />
        </div>
      </div>

      {/* Danger Zone */}
      <DangerZoneCard merchant={merchant} />

      {/* Logout */}
      <button onClick={logout} className={styles.logoutBtn}>
        <LogOut size={18} />
        Log Out
      </button>
    </div>
  );
}
