"use client";
import React from "react";
import PropTypes from "prop-types";
import { MapPin } from "lucide-react";
import Badge from "../Badge";
import styles from "./StorePerformanceCard.module.css";

const STATUS_VARIANT = {
  active: "success",
  inactive: "default",
  paused: "warning",
};

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function num(value) {
  return Number.isFinite(value) ? value : 0;
}

function getBadge(isMainStore, hasPendingRequest, status) {
  if (isMainStore) return { label: "MAIN STORE", variant: "primary" };
  if (hasPendingRequest) return { label: "Pending Request", variant: "warning" };
  if (status) {
    return {
      label: status,
      variant: STATUS_VARIANT[String(status).toLowerCase()] || "default",
    };
  }
  return null;
}

export default function StorePerformanceCard({
  storeName,
  status,
  isMainStore,
  location,
  contactPerson,
  scans,
  campaignCount,
  priceRange,
  entitlementLabel,
  used,
  hasPendingRequest,
  onViewStore,
  onReview,
}) {
  const badge = getBadge(isMainStore, hasPendingRequest, status);

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{storeName || "Store"}</h3>
        {badge && <Badge label={badge.label} variant={badge.variant} />}
      </div>

      {location && (
        <span className={styles.location}>
          <MapPin size={13} className={styles.pin} />
          {location}
        </span>
      )}

      {contactPerson && (
        <div className={styles.contact}>
          <span className={styles.avatar} aria-hidden="true">
            {getInitials(contactPerson)}
          </span>
          <span className={styles.contactName}>{contactPerson}</span>
        </div>
      )}

      <div className={styles.meta}>
        <span className={styles.metaItem}>{num(scans)} Scans</span>
        <span className={styles.dot}>·</span>
        <span className={styles.metaItem}>{num(campaignCount)} Campaigns</span>
        {priceRange && (
          <>
            <span className={styles.dot}>·</span>
            <span className={styles.metaItem}>{priceRange}</span>
          </>
        )}
      </div>

      {(entitlementLabel != null || used != null) && (
        <div className={styles.entitlement}>
          <span className={styles.entitlementLabel}>
            {entitlementLabel ?? `${num(used)} allocated`}
          </span>
          <span className={styles.used}>{num(used)} Used</span>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnOutline}`}
          onClick={onViewStore}
        >
          View Store
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSolid}`}
          onClick={onReview}
        >
          Review
        </button>
      </div>
    </article>
  );
}

StorePerformanceCard.propTypes = {
  storeName: PropTypes.string,
  status: PropTypes.string,
  isMainStore: PropTypes.bool,
  location: PropTypes.string,
  contactPerson: PropTypes.string,
  scans: PropTypes.number,
  campaignCount: PropTypes.number,
  priceRange: PropTypes.string,
  entitlementLabel: PropTypes.string,
  used: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hasPendingRequest: PropTypes.bool,
  onViewStore: PropTypes.func,
  onReview: PropTypes.func,
};
