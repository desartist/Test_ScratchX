'use client';

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  MapPin,
  Clock,
  Megaphone,
  IndianRupee,
  Infinity as InfinityIcon,
  Trash2,
} from 'lucide-react';
import Badge from '../dashboard/Badge';
import ProgressBar from '../dashboard/ProgressBar';
import styles from './StoreCard.module.css';

/**
 * Build manager initials from a name, guarding against missing/empty names.
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Status badge: pending request takes priority (danger/pink), otherwise map
 * the store status to a badge variant.
 */
function getStatusBadge(status, hasPendingRequest) {
  if (hasPendingRequest) {
    return { label: 'Pending Request', variant: 'danger' };
  }
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'active':
      return { label: 'Active', variant: 'success' };
    case 'pending':
      return { label: 'Pending', variant: 'warning' };
    case 'inactive':
      return { label: 'Inactive', variant: 'default' };
    case 'suspended':
      return { label: 'Suspended', variant: 'warning' };
    default:
      return { label: status || 'Active', variant: 'default' };
  }
}

export default function StoreCard({
  id = '',
  name = 'Store Name',
  city = 'City',
  state = 'State',
  status = 'active',
  campaignsCount = 0,
  scans = 0,
  priceRange = null,
  managerName = '',
  scratchTotal = 0,
  scratchUsed = 0,
  scratchRemaining = 0,
  hasPendingRequest = false,
  unlimited = false,
  isMainStore = false,
  onView = () => {},
  onAssign = () => {},
  onReview = () => {},
  onDelete = () => {},
}) {
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);

  const statusBadge = useMemo(
    () => getStatusBadge(status, hasPendingRequest),
    [status, hasPendingRequest],
  );

  const initials = useMemo(() => getInitials(managerName), [managerName]);
  const hasManager = Boolean(managerName && managerName.trim() && managerName !== 'Unknown');

  // Scratch math (guard divide-by-zero)
  const total = Number(scratchTotal || 0);
  const used = Number(scratchUsed || 0);
  const remaining = Number(
    scratchRemaining !== undefined && scratchRemaining !== null
      ? scratchRemaining
      : Math.max(0, total - used),
  );

  const location = [city, state].filter(Boolean).join(', ');

  const handleView = useCallback(
    (event) => {
      event.stopPropagation();
      onView(id);
    },
    [onView, id],
  );

  const handlePrimary = useCallback(
    (event) => {
      event.stopPropagation();
      if (hasPendingRequest) {
        onReview(id);
      } else {
        onAssign(id);
      }
    },
    [hasPendingRequest, onReview, onAssign, id],
  );

  const handleDelete = useCallback(
    (event) => {
      event.stopPropagation();
      if (!isMainStore) onDelete(id);
    },
    [isMainStore, onDelete, id],
  );

  return (
    <div className={styles.card}>
      {/* Header: name + status badge */}
      <div className={styles.cardHeader}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>{name}</h3>
            {isMainStore && (
              <span className={styles.mainStoreBadge} title="This is your main store">
                Main
              </span>
            )}
          </div>
          <p className={styles.location}>
            <MapPin size={14} className={styles.locationIcon} />
            {location || '—'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <Badge label={statusBadge.label} variant={statusBadge.variant} />
          <div className={styles.deleteButtonWrapper}>
            <button
              type="button"
              className={`${styles.deleteBtn} ${isMainStore ? styles.disabled : ''}`}
              onClick={handleDelete}
              onMouseEnter={() => isMainStore && setShowDeleteTooltip(true)}
              onMouseLeave={() => setShowDeleteTooltip(false)}
              disabled={isMainStore}
              title={isMainStore ? 'This is your Main Store and cannot be deleted' : 'Delete store'}
              aria-label="Delete store"
            >
              <Trash2 size={15} />
            </button>
            {isMainStore && showDeleteTooltip && (
              <div className={styles.tooltip}>
                This is your Main Store.<br />Cannot be deleted.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manager chip */}
      <div className={styles.managerRow}>
        {hasManager ? (
          <>
            <span className={styles.avatar} aria-hidden="true">
              {initials}
            </span>
            <span className={styles.managerName}>{managerName}</span>
          </>
        ) : (
          <span className={styles.managerName}>—</span>
        )}
      </div>

      {/* Meta row */}
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          <Clock size={15} className={styles.metaIcon} />
          {scans} Scan{scans !== 1 ? 's' : ''}
        </span>
        <span className={styles.metaItem}>
          <Megaphone size={15} className={styles.metaIcon} />
          {campaignsCount} Campaign{campaignsCount !== 1 ? 's' : ''}
        </span>
        {priceRange && (
          <span className={styles.metaItem}>
            <IndianRupee size={15} className={styles.metaIcon} />
            {priceRange}
          </span>
        )}
      </div>

      {/* Scratch line — unlimited vs allocation */}
      {unlimited ? (
        <div className={styles.scratchSection}>
          <div className={styles.scratchHeader}>
            <span className={styles.unlimitedLabel}>
              <InfinityIcon size={15} className={styles.unlimitedIcon} />
              Unlimited Active
            </span>
            <span className={styles.scratchCount}>{used.toLocaleString()} Used</span>
          </div>
        </div>
      ) : (
        <div className={styles.scratchSection}>
          <div className={styles.scratchHeader}>
            <span className={styles.scratchLabel}>Scratch Allocation</span>
            <span className={styles.scratchCount}>
              {used.toLocaleString()} / {total.toLocaleString()}
            </span>
          </div>
          <ProgressBar current={used} total={total} showLabel={false} />
          <div className={styles.scratchRemaining}>
            {remaining.toLocaleString()} left
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button type="button" className={styles.viewBtn} onClick={handleView}>
          View Store
        </button>
        <button
          type="button"
          className={`${styles.primaryBtn} ${hasPendingRequest ? styles.review : styles.assign}`}
          onClick={handlePrimary}
        >
          {hasPendingRequest ? 'Review' : 'Assign'}
        </button>
      </div>
    </div>
  );
}

StoreCard.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  city: PropTypes.string,
  state: PropTypes.string,
  status: PropTypes.string,
  campaignsCount: PropTypes.number,
  scans: PropTypes.number,
  priceRange: PropTypes.string,
  managerName: PropTypes.string,
  scratchTotal: PropTypes.number,
  scratchUsed: PropTypes.number,
  scratchRemaining: PropTypes.number,
  hasPendingRequest: PropTypes.bool,
  unlimited: PropTypes.bool,
  isMainStore: PropTypes.bool,
  onView: PropTypes.func,
  onAssign: PropTypes.func,
  onReview: PropTypes.func,
  onDelete: PropTypes.func,
};
