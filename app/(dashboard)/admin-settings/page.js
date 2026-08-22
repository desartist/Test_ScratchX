"use client";

import React, { useState } from "react";
import { Info, Percent, Wrench, Mail, LogOut } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import {
  useAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
} from "@/hooks/queries/useAdminSettingsQuery";
import styles from "./admin-settings.module.css";

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useAdminSettingsQuery();

  if (isLoading || !settings) {
    return <div className={styles.page}><div className={styles.container}>Loading settings...</div></div>;
  }

  return <SettingsForm settings={settings} />;
}

// Mounts fresh once `settings` has loaded, so lazy useState initializers can
// prefill from it directly — no effect needed to sync query data into form state.
function SettingsForm({ settings }) {
  const { account, logout } = useAuthContext();
  const updateMutation = useUpdateAdminSettingsMutation();
  const [loggingOut, setLoggingOut] = useState(false);

  const [defaultCommissionRate, setDefaultCommissionRate] = useState(() =>
    settings.defaultCommissionRate === null || settings.defaultCommissionRate === undefined
      ? ""
      : String(settings.defaultCommissionRate),
  );
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(() => !!settings.maintenanceMode?.enabled);
  const [maintenanceMessage, setMaintenanceMessage] = useState(() => settings.maintenanceMode?.message || "");
  const [salesEmail, setSalesEmail] = useState(() => settings.supportContacts?.salesEmail || "");
  const [supportEmail, setSupportEmail] = useState(() => settings.supportContacts?.supportEmail || "");
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave() {
    await updateMutation.mutateAsync({
      defaultCommissionRate: defaultCommissionRate === "" ? null : Number(defaultCommissionRate),
      maintenanceMode: { enabled: maintenanceEnabled, message: maintenanceMessage },
      supportContacts: { salesEmail, supportEmail },
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Platform Settings</h1>
          <p>Values that genuinely affect platform behavior — nothing decorative</p>
        </div>

        <div className={styles.scopeNote}>
          <Info size={16} />
          <span>
            This page only exposes settings that actually change platform behavior when saved.
            Subscription plan pricing and GST rate are defined in code across the checkout flow
            and are intentionally not editable here — editing a database value for them would not
            change what merchants are actually charged.
          </span>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Percent size={18} />
            <h3>Default Distributor Commission</h3>
          </div>
          <p className={styles.sectionDesc}>
            Used only when a distributor doesn&apos;t have their own commission rate set (Distributors page).
          </p>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Default Commission Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className={styles.formInput}
              value={defaultCommissionRate}
              onChange={(e) => setDefaultCommissionRate(e.target.value)}
              placeholder="e.g. 5"
            />
            <span className={styles.formHint}>Leave blank to fall back to the DISTRIBUTOR_COMMISSION_RATE environment default.</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Wrench size={18} />
            <h3>Maintenance Mode</h3>
          </div>
          <p className={styles.sectionDesc}>
            When enabled, every role except Super_Admin sees a maintenance notice instead of the dashboard.
          </p>
          <div className={styles.toggleRow}>
            <div>
              <div className={styles.toggleLabel}>Enable Maintenance Mode</div>
              <div className={styles.toggleDesc}>Takes effect immediately for all non-admin users</div>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={(e) => setMaintenanceEnabled(e.target.checked)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          <div className={styles.formGroup} style={{ marginTop: 16 }}>
            <label className={styles.formLabel}>Maintenance Message</label>
            <input
              className={styles.formInput}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="We're making some improvements. Please check back shortly."
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Mail size={18} />
            <h3>Support Contact Emails</h3>
          </div>
          <p className={styles.sectionDesc}>
            Shown on the Support &amp; Help page seen by retailers and distributors.
          </p>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sales &amp; Demo Email</label>
              <input
                type="email"
                className={styles.formInput}
                value={salesEmail}
                onChange={(e) => setSalesEmail(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Support Email</label>
              <input
                type="email"
                className={styles.formInput}
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {justSaved && <span className={styles.savedNote}>Saved</span>}
          <button className={styles.saveButton} onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <LogOut size={18} />
            <h3>Session</h3>
          </div>
          <p className={styles.sectionDesc}>
            Signed in as {account?.name || account?.email} (Super Admin).
          </p>
          <button className={styles.logoutButton} onClick={handleLogout} disabled={loggingOut}>
            <LogOut size={16} />
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
