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
} from 'lucide-react';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [typeFilter, readFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: 100,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(readFilter !== 'all' && { read: readFilter === 'unread' ? false : true }),
      });

      const res = await fetch(`/api/distributor/notifications?${params}`, {
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
            <p>Stay updated with important alerts</p>
          </div>
          {unreadCount > 0 && (
            <div className={styles.unreadBadge}>
              {unreadCount} unread
            </div>
          )}
        </div>

        {/* Filters */}
        <div className={styles.filterSection}>
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="order_confirmed">Order Confirmed</option>
            <option value="inventory_low">Inventory Low</option>
            <option value="plan_assigned">Plan Assigned</option>
            <option value="commission_earned">Commission Earned</option>
            <option value="payout_processed">Payout Processed</option>
          </select>
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
