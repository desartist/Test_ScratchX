"use client";
import React from "react";
import PropTypes from "prop-types";
import Badge from "../Badge";
import ProgressBar from "../ProgressBar";
import styles from "./TopCampaignCard.module.css";

const STATUS_VARIANT = {
  active: "success",
  scheduled: "info",
  paused: "warning",
  expired: "danger",
  draft: "default",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function num(value) {
  return Number.isFinite(value) ? value : 0;
}

export default function TopCampaignCard({
  name,
  status,
  startDate,
  endDate,
  daysLeft,
  storeCount,
  priceRange,
  scratchAllocated,
  scratchTotal,
  pendingStore,
  onView,
  onAssign,
}) {
  const allocated = num(scratchAllocated);
  const total = num(scratchTotal);
  const left = Math.max(total - allocated, 0);
  const statusVariant = status
    ? STATUS_VARIANT[String(status).toLowerCase()] || "default"
    : null;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{name || "Untitled campaign"}</h3>
        {status && <Badge label={status} variant={statusVariant} />}
      </div>

      <p className={styles.dates}>
        {formatDate(startDate)} – {formatDate(endDate)}
      </p>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          {Number.isFinite(daysLeft) ? daysLeft : 0} days left
        </span>
        <span className={styles.dot}>·</span>
        <span className={styles.metaItem}>{num(storeCount)} Stores</span>
        {priceRange && (
          <>
            <span className={styles.dot}>·</span>
            <span className={styles.metaItem}>{priceRange}</span>
          </>
        )}
      </div>

      <div className={styles.progress}>
        <ProgressBar current={allocated} total={total} showLabel />
        <span className={styles.left}>{left} left</span>
      </div>

      {pendingStore && (
        <p className={styles.pending}>
          <span aria-hidden="true">⚠</span> Pending request: {pendingStore}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnOutline}`}
          onClick={onView}
        >
          View
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSolid}`}
          onClick={onAssign}
        >
          Assign
        </button>
      </div>
    </article>
  );
}

TopCampaignCard.propTypes = {
  name: PropTypes.string,
  status: PropTypes.string,
  startDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  endDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  daysLeft: PropTypes.number,
  storeCount: PropTypes.number,
  priceRange: PropTypes.string,
  scratchAllocated: PropTypes.number,
  scratchTotal: PropTypes.number,
  pendingStore: PropTypes.string,
  onView: PropTypes.func,
  onAssign: PropTypes.func,
};
