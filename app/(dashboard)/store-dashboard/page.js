"use client";

import React from "react";
import { Store as StoreIcon, Users, ShieldCheck, AlertCircle, Phone, MapPin } from "lucide-react";
import { useStoreDashboardQuery } from "@/hooks/queries/useStoreDashboardQuery";
import LoadingState from "@/components/common/LoadingState";
import styles from "./store-dashboard.module.css";

const ROLE_LABELS = { Store_Manager: "Store Manager", Store_Staff: "Store Staff" };

const PERMISSION_LABELS = {
  "campaign:read": "View campaigns",
  "campaign:update": "Edit campaigns",
  "store:read": "View store details",
  "store:update": "Edit store details",
  "range:read": "View reward ranges",
  "scan:read": "View scan history",
  "scan:redeem": "Redeem customer scratch cards",
  "inventory:read": "View scratch card inventory",
  "inventory:allocate": "Allocate scratch card inventory",
  "analytics:own_store": "View this store's analytics",
  "analytics:read": "View basic analytics",
};

export default function StoreDashboardPage() {
  const { data, isPending: loading, error: queryError } = useStoreDashboardQuery();
  const error = queryError ? queryError.message : null;

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingState message="Loading your store..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{error || "Unable to load your store dashboard."}</p>
        </div>
      </div>
    );
  }

  const { role, permissions, store, teammates } = data;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{store.name}</h1>
        <p className={styles.pageSubtitle}>
          You're signed in as <strong>{ROLE_LABELS[role] || role}</strong> for this store.
        </p>
      </div>

      <div className={styles.grid}>
        {/* Store info */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <StoreIcon size={18} />
            <h2>Store Details</h2>
          </div>
          <div className={styles.infoRow}>
            <MapPin size={14} />
            <span>
              {store.address}, {store.city}, {store.state} {store.pincode}
            </span>
          </div>
          <div className={styles.infoRow}>
            <Phone size={14} />
            <span>
              {store.contactPerson} · {store.contactNumber}
            </span>
          </div>
          <span className={`${styles.statusBadge} ${styles[store.status] || ""}`}>{store.status}</span>
        </div>

        {/* Your access */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <ShieldCheck size={18} />
            <h2>Your Access</h2>
          </div>
          {permissions.length === 0 ? (
            <p className={styles.emptyText}>No permissions configured for this role yet.</p>
          ) : (
            <ul className={styles.permissionList}>
              {permissions.map((p) => (
                <li key={p}>{PERMISSION_LABELS[p] || p}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Teammates */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <Users size={18} />
            <h2>Team at this Store</h2>
          </div>
          {teammates.length === 0 ? (
            <p className={styles.emptyText}>No other team members at this store yet.</p>
          ) : (
            <div className={styles.teammateList}>
              {teammates.map((t) => (
                <div key={t._id} className={styles.teammateRow}>
                  <div>
                    <div className={styles.teammateName}>{t.name}</div>
                    <div className={styles.teammateEmail}>{t.email}</div>
                  </div>
                  <span className={styles.roleBadge}>{ROLE_LABELS[t.role] || t.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
