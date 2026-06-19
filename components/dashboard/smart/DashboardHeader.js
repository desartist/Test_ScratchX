"use client";
import React from "react";
import PropTypes from "prop-types";
import { Bell, Plus } from "lucide-react";
import styles from "./DashboardHeader.module.css";

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardHeader({
  merchantName,
  storeName,
  location,
  unreadCount = 0,
  onCreateCampaign,
  onBellClick,
}) {
  const displayName = storeName || merchantName || "Store";
  const initials = getInitials(storeName || merchantName);
  const safeUnread = Number.isFinite(unreadCount) ? unreadCount : 0;

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Manage your stores and campaigns</p>
        </div>
        <div className={styles.topRowRight}>
          {/* {onBellClick && (
            <button type="button" className={styles.bell} onClick={onBellClick} aria-label="Notifications">
              <Bell size={18} />
              {safeUnread > 0 && (
                <span className={styles.badge}>{safeUnread > 99 ? "99+" : safeUnread}</span>
              )}
            </button>
          )} */}
          {onCreateCampaign && (
            <button
              type="button"
              className={styles.createBtn}
              onClick={onCreateCampaign}
            >
              <Plus size={16} />
              Create Campaign
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

DashboardHeader.propTypes = {
  merchantName: PropTypes.string,
  storeName: PropTypes.string,
  location: PropTypes.string,
  unreadCount: PropTypes.number,
  onCreateCampaign: PropTypes.func,
  onBellClick: PropTypes.func,
};
