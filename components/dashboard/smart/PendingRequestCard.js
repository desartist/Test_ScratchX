"use client";
import React from "react";
import PropTypes from "prop-types";
import Badge from "../Badge";
import styles from "./PendingRequestCard.module.css";

const PRIORITY_VARIANT = {
  high: "danger",
  medium: "warning",
  low: "info",
};

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PendingRequestCard({
  title,
  priority,
  storeName,
  timeAgo,
  requesterName,
  requestedQty,
  campaignName,
  note,
  onReview,
  onApprove,
  busy = false,
}) {
  const priorityVariant = priority
    ? PRIORITY_VARIANT[String(priority).toLowerCase()] || "default"
    : null;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title || "Request"}</h3>
        {priority && <Badge label={priority} variant={priorityVariant} />}
      </div>

      <div className={styles.subRow}>
        {storeName && <span className={styles.store}>{storeName}</span>}
        {timeAgo && (
          <>
            {storeName && <span className={styles.dot}>·</span>}
            <span className={styles.time}>{timeAgo}</span>
          </>
        )}
      </div>

      {requesterName && (
        <div className={styles.requester}>
          <span className={styles.avatar} aria-hidden="true">
            {getInitials(requesterName)}
          </span>
          <span className={styles.requesterName}>{requesterName}</span>
        </div>
      )}

      <div className={styles.details}>
        <span className={styles.detailRow}>
          <span className={styles.detailLabel}>Requested Scratches:</span>{" "}
          <span className={styles.detailValue}>
            {requestedQty != null && requestedQty !== "" ? requestedQty : "—"}
          </span>
        </span>
        <span className={styles.detailRow}>
          <span className={styles.detailLabel}>Campaign:</span>{" "}
          <span className={styles.detailValue}>{campaignName || "—"}</span>
        </span>
      </div>

      {note && <p className={styles.note}>{note}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnOutline}`}
          onClick={onReview}
          disabled={busy}
        >
          {busy ? "Processing…" : "Review"}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSolid}`}
          onClick={onApprove}
          disabled={busy}
        >
          {busy ? "Processing…" : "Approve"}
        </button>
      </div>
    </article>
  );
}

PendingRequestCard.propTypes = {
  title: PropTypes.string,
  priority: PropTypes.string,
  storeName: PropTypes.string,
  timeAgo: PropTypes.string,
  requesterName: PropTypes.string,
  requestedQty: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  campaignName: PropTypes.string,
  note: PropTypes.string,
  onReview: PropTypes.func,
  onApprove: PropTypes.func,
  busy: PropTypes.bool,
};
