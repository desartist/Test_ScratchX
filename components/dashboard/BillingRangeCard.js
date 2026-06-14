'use client';
import React from "react"

import Link from 'next/link';
import styles from './BillingRangeCard.module.css';

/**
 * Get the appropriate badge class based on status
 * @param {string} status - 'active', 'inactive', or 'expired'
 * @returns {string} CSS class name for the badge
 */
function getBadgeClass(status) {
  switch (status) {
    case 'active':
      return styles.badgeActive;
    case 'inactive':
      return styles.badgeInactive;
    case 'expired':
      return styles.badgeExpired;
    default:
      return styles.badgeActive;
  }
}

/**
 * Get human-readable status text
 * @param {string} status - 'active', 'inactive', or 'expired'
 * @returns {string} Display text for the status
 */
function getStatusText(status) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'expired':
      return 'Expired';
    default:
      return 'Active';
  }
}

/**
 * BillingRangeCard Component
 * Displays a billing range with details in a clickable card grid
 * Shows interactive action buttons (Edit, Duplicate, Delete) on hover
 */
export default function BillingRangeCard({
  rangeId,
  campaignId,
  label,
  minAmount,
  maxAmount,
  rewardType,
  totalQuantity,
  status = 'active',
  onEdit,
  onDuplicate,
  onDelete,
}) {
  const handleEdit = (e) => {
    e.preventDefault();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDuplicate = (e) => {
    e.preventDefault();
    if (onDuplicate) {
      onDuplicate();
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <Link
      href={`/range/${campaignId}/edit/${rangeId}`}
      className={styles.card}
    >
      {/* Header with title and status badge */}
      <div className={styles.header}>
        <h3 className={styles.title}>{label}</h3>
        <span className={`${styles.badge} ${getBadgeClass(status)}`}>
          {getStatusText(status)}
        </span>
      </div>

      {/* Details section */}
      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Range</span>
          <span className={styles.detailValue}>
            ₹{minAmount} - ₹{maxAmount}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Reward Type</span>
          <span className={styles.detailValue}>{rewardType}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Quantity</span>
          <span className={styles.detailValue}>{totalQuantity}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={handleEdit}
          title="Edit this range"
        >
          Edit
        </button>
        <button
          className={styles.actionBtn}
          onClick={handleDuplicate}
          title="Duplicate this range"
        >
          Duplicate
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={handleDelete}
          title="Delete this range"
        >
          Delete
        </button>
      </div>
    </Link>
  );
}
