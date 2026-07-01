// components/dashboard/CampaignCard.js
"use client";
import React, { useCallback, useMemo, useState } from "react";
import { Clock, Store, IndianRupee, AlertTriangle, Plus } from "lucide-react";
import Badge from "./Badge";
import ProgressBar from "./ProgressBar";
import CampaignCardMenu from "./CampaignCardMenu";
import styles from "./CampaignCard.module.css";

// Low-scratch threshold: 10% or less of allocated remaining (allocated must be > 0).
const LOW_SCRATCH_RATIO = 0.1;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function getStatusBadge(status) {
  const s = String(status || "").toLowerCase().replace(/\s+/g, "_");
  switch (s) {
    case "active":
      return { label: "Active", variant: "success" };
    case "ending_soon":
      return { label: "Ending Soon", variant: "danger" };
    case "paused":
      return { label: "Paused", variant: "warning" };
    case "ended":
      return { label: "Ended", variant: "default" };
    case "draft":
      return { label: "Draft", variant: "default" };
    default:
      return { label: status || "Draft", variant: "default" };
  }
}

export default function CampaignCard({
  id = "",
  name = "Campaign Name",
  startDate = "",
  endDate = "",
  status = "active",
  storesCount = 0,
  scratchesLeft = 0,
  scratchesAllocated = 0,
  scratchesTotal = 0,
  scratchesDistributed = 0,
  scratchesClaimed = 0,
  priceRange = null,
  hasRanges = false,
  onView = () => {},
  onEdit = () => {},
  onClone = () => {},
  onAction = () => {},
}) {
  // Capture "now" once via a lazy state initializer so render stays pure.
  const [nowMs] = useState(() => Date.now());

  // Days left
  const daysDisplay = useMemo(() => {
    const endDateObj = new Date(endDate);
    if (Number.isNaN(endDateObj.getTime())) return "Ended";
    const daysLeft = Math.ceil(
      (endDateObj.getTime() - nowMs) / (1000 * 60 * 60 * 24),
    );
    return daysLeft > 0 ? `${daysLeft} days left` : "Ended";
  }, [endDate, nowMs]);

  // Scratch math (guard divide-by-zero)
  const allocated = Number(scratchesAllocated || scratchesTotal || 0);
  const remaining = Number(scratchesLeft || 0);
  const used = Math.max(0, allocated - remaining);
  const isLow =
    allocated > 0 && remaining / allocated <= LOW_SCRATCH_RATIO;

  const statusBadge = getStatusBadge(status);
  const isPaused = String(status || "").toLowerCase() === "paused";

  const dateRange =
    formatDate(startDate) && formatDate(endDate)
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : formatDate(startDate) || formatDate(endDate) || "";

  const handleCardClick = useCallback(() => {
    onView(id);
  }, [onView, id]);

  const handleCardKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onView(id);
      }
    },
    [onView, id],
  );

  const handleMenuAction = useCallback(
    (action) => {
      return onAction(action, id);
    },
    [onAction, id],
  );

  const handleAddScratches = useCallback(
    (event) => {
      event.stopPropagation();
      onAction("scratches", id);
    },
    [onAction, id],
  );

  return (
    <div
      className={styles.card}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* Header: name + status + menu */}
      <div className={styles.cardHeader}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>{name}</h3>
            <Badge label={statusBadge.label} variant={statusBadge.variant} />
          </div>
          {dateRange && <p className={styles.dateRange}>{dateRange}</p>}
        </div>
        <div
          className={styles.menuWrap}
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <CampaignCardMenu onAction={handleMenuAction} isPaused={isPaused} />
        </div>
      </div>

      {/* Meta row */}
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>
          <Clock size={16} className={styles.metaIcon} />
          <span className={styles.metaItemBold}>{daysDisplay.replace(" left", "")}</span>
          {daysDisplay.includes(" left") && <span> left</span>}
        </span>
        <span className={styles.metaItem}>
          <Store size={16} className={styles.metaIcon} />
          <span className={styles.metaItemBold}>{storesCount}</span>
          <span> Store{storesCount !== 1 ? "s" : ""}</span>
        </span>
        {priceRange && (
          <span className={styles.metaItem}>
            <IndianRupee size={16} className={styles.metaIcon} />
            {priceRange}
          </span>
        )}
      </div>

      {/* Scratch allocation */}
      <div className={styles.scratchSection}>
        <div className={styles.scratchHeader}>
          <span className={styles.scratchLabel}>Scratch Allocation</span>
          {allocated > 0 && (
            <span className={styles.scratchCount}>
              {used.toLocaleString()} / {allocated.toLocaleString()}
            </span>
          )}
        </div>
        {allocated > 0 ? (
          <>
            <ProgressBar
              current={used}
              total={allocated}
              showLabel={false}
              status={isLow ? "critical" : "normal"}
            />
            <div className={`${styles.scratchRemaining} ${isLow ? styles.scratchRemainingLow : ""}`}>
              {remaining.toLocaleString()} left
            </div>
          </>
        ) : (
          <div className={styles.scratchNotSet}>No scratches allocated yet</div>
        )}
      </div>

      {/* Low-scratch warning + Add */}
      {isLow && (
        <div className={styles.lowWarning}>
          <span className={styles.lowWarningText}>
            <AlertTriangle size={15} className={styles.lowWarningIcon} />
            Only {remaining.toLocaleString()} scratches left
          </span>
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddScratches}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      )}
    </div>
  );
}
