'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  Filter,
  LogIn,
  Plus,
  Edit2,
  Trash,
  MapPin,
  Gift,
  Users,
} from 'lucide-react';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/distributor/notifications?limit=100`, {
        credentials: 'include',
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setNotifications(json.data.notifications || []);
      setUnreadCount(json.data.unread || 0);
      setError(null);
    } catch (err) {
      console.error('[Notifications] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const res = await fetch(`/api/distributor/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success) {
        setNotifications(
          notifications.map((n) =>
            n._id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const res = await fetch(`/api/distributor/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success) {
        setNotifications(notifications.filter((n) => n._id !== notificationId));
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'user_login':
        return <LogIn size={20} />;
      case 'campaign_created':
        return <Plus size={20} />;
      case 'campaign_updated':
        return <Edit2 size={20} />;
      case 'campaign_deleted':
        return <Trash size={20} />;
      case 'store_created':
        return <Plus size={20} />;
      case 'store_updated':
        return <MapPin size={20} />;
      case 'coupon_created':
        return <Gift size={20} />;
      case 'participation_created':
        return <Users size={20} />;
      case 'success':
        return <CheckCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Notifications</h1>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchNotifications} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <div className={styles.unreadBadge}>
              {unreadCount} unread
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className={styles.notificationsList}>
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <Bell size={48} />
              <p>No notifications</p>
              <span>You're all caught up!</span>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`${styles.notificationItem} ${
                  !notification.read ? styles.unread : ''
                }`}
              >
                <div className={`${styles.icon} ${styles[`type-${notification.type}`]}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className={styles.content}>
                  <h4 className={styles.title}>{notification.title}</h4>
                  <p className={styles.message}>{notification.message}</p>
                  <span className={styles.time}>
                    {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className={styles.actions}>
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification._id)}
                      className={styles.actionBtn}
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification._id)}
                    className={`${styles.actionBtn} ${styles.delete}`}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
