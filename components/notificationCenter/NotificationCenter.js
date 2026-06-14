"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./NotificationCenter.module.css";

export default function NotificationCenter() {
  const { account } = useAuthContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account?.id) {
      fetchNotifications();

      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [account?.id]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: "POST",
        credentials: "include",
      });

      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDismiss = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/dismiss`, {
        method: "POST",
        credentials: "include",
      });

      setNotifications((prev) =>
        prev.filter((notif) => notif._id !== notificationId)
      );
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const getIcon = (severity) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle size={20} />;
      case "high":
        return <AlertCircle size={20} />;
      case "medium":
        return <Clock size={20} />;
      case "low":
        return <Info size={20} />;
      default:
        return <CheckCircle size={20} />;
    }
  };

  return (
    <div className={styles.notificationCenter}>
      {/* Bell Icon with Badge */}
      <button
        className={styles.bellButton}
        onClick={() => setShowPanel(!showPanel)}
        aria-label="Notifications"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Notifications</h3>
            <button
              onClick={() => setShowPanel(false)}
              className={styles.closeButton}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.panelContent}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <Info size={32} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`${styles.notificationItem} ${
                    !notif.read ? styles.unread : ""
                  } ${styles[`severity-${notif.severity}`]}`}
                >
                  <div className={styles.iconWrapper}>
                    {getIcon(notif.severity)}
                  </div>

                  <div className={styles.content}>
                    <h4 className={styles.title}>{notif.title}</h4>
                    <p className={styles.message}>{notif.message}</p>
                    <div className={styles.meta}>
                      <time className={styles.timestamp}>
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {notif.actionUrl && (
                      <a
                        href={notif.actionUrl}
                        className={styles.actionLink}
                        onClick={() => setShowPanel(false)}
                      >
                        {notif.actionText || "View"}
                      </a>
                    )}
                    <button
                      onClick={() => handleDismiss(notif._id)}
                      className={styles.dismissButton}
                      aria-label="Dismiss"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif._id)}
                      className={styles.markReadButton}
                      aria-label="Mark as read"
                    >
                      •
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
