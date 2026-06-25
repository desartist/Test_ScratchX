"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/auth/AuthContext";
import { criticalFetchService } from "@/lib/criticalFetchService";
import styles from "./page.module.css";

// ── Icon map by notification type ──────────────────────────────
const TYPE_ICON = {
  plan_purchased:        { emoji: "⚡", bg: "#fff8ec", border: "#fde8ba", dot: "#ef9e1b" },
  scratch_pack_purchased:{ emoji: "🎟️", bg: "#f0fff4", border: "#b7f5cc", dot: "#22c55e" },
  scratch_expiry_warning:{ emoji: "⏰", bg: "#fff8ec", border: "#fde8ba", dot: "#ef9e1b" },
  scratch_expired:       { emoji: "❌", bg: "#fff0f0", border: "#ffc5c5", dot: "#ef4444" },
  campaign_created:      { emoji: "🎯", bg: "#f0f2ff", border: "#e0e4ff", dot: "#6c5ce7" },
  campaign_activated:    { emoji: "🚀", bg: "#f0fff4", border: "#b7f5cc", dot: "#22c55e" },
  system_alert:          { emoji: "🔔", bg: "#f0f2ff", border: "#e0e4ff", dot: "#010f44" },
  other:                 { emoji: "📌", bg: "#f5f6ff", border: "#e8eaff", dot: "#9ba8b8" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>🔔</div>
      <h3 className={styles.emptyTitle}>All caught up!</h3>
      <p className={styles.emptyDesc}>
        Notifications appear here when you log in, create stores or campaigns, and purchase plans.
      </p>
    </div>
  );
}

export default function NotificationsPage() {
  const { account } = useAuthContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!account?.id) return;
    try {
      const result = await criticalFetchService.fetchCriticalFirst(
        'notifications-page',
        [
          {
            key: 'notifications',
            url: '/api/notifications?limit=50',
            options: {
              headers: { 'x-user-id': account.id, 'x-user-role': account.role || 'Merchant' },
              credentials: 'include',
            },
          },
        ],
        []
      );

      const data = result.critical?.notifications;
      if (data) {
        setNotifications(data.data || []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [account]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
        headers: { "x-user-id": account?.id, "x-user-role": account?.role || "Merchant" },
      });
    } catch (_) {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read)
          .map((n) =>
            fetch(`/api/notifications/${n._id}/read`, {
              method: "POST",
              credentials: "include",
              headers: { "x-user-id": account?.id, "x-user-role": account?.role || "Merchant" },
            })
          )
      );
    } catch (_) {}
    setMarkingAll(false);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Your account activity and alerts</p>
        </div>
        <div className={styles.headerRight}>
          {unreadCount > 0 && (
            <div className={styles.unreadBadge}>{unreadCount} unread</div>
          )}
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={markAllRead} disabled={markingAll}>
              {markingAll ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className={styles.listCard}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} style={{ width: "55%" }} />
                <div className={styles.skeletonLine} style={{ width: "80%", height: 11 }} />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>Recent Activity</span>
            <span className={styles.listCount}>{notifications.length} total</span>
          </div>

          <div className={styles.list}>
            {notifications.map((n) => {
              const s = TYPE_ICON[n.type] || TYPE_ICON.other;
              return (
                <div
                  key={n._id}
                  className={`${styles.item} ${!n.read ? styles.unread : ""}`}
                  onClick={() => !n.read && markAsRead(n._id)}
                >
                  <div className={styles.itemIcon} style={{ background: s.bg, borderColor: s.border }}>
                    {s.emoji}
                  </div>

                  <div className={styles.itemBody}>
                    <div className={styles.itemTitle}>{n.title}</div>
                    <div className={styles.itemDesc}>{n.message}</div>
                    {n.actionUrl && n.actionText && (
                      <Link href={n.actionUrl} className={styles.actionLink} onClick={(e) => e.stopPropagation()}>
                        {n.actionText} →
                      </Link>
                    )}
                  </div>

                  <div className={styles.itemMeta}>
                    <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
                    {!n.read && <span className={styles.dot} style={{ background: s.dot }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
