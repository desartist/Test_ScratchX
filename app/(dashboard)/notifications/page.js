'use client';

import React from 'react';
import {
  Bell,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Filter,
  Plus,
  Gift,
} from 'lucide-react';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useDeleteNotificationMutation,
} from '@/hooks/queries/useNotificationsQuery';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const { data, isPending: loading, error: queryError, refetch } = useNotificationsQuery();
  const notifications = data?.notifications || [];
  const unreadCount = data?.unread || 0;
  const error = queryError ? queryError.message : null;

  const markReadMutation = useMarkNotificationReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  const handleMarkAsRead = (notificationId) => {
    markReadMutation.mutate(notificationId, {
      onError: (err) => alert(`Error: ${err.message}`),
    });
  };

  const handleDelete = (notificationId) => {
    deleteMutation.mutate(notificationId, {
      onError: (err) => alert(`Error: ${err.message}`),
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'campaign_created':
        return <Plus size={20} />;
      case 'campaign_activated':
        return <CheckCircle size={20} />;
      case 'plan_purchased':
      case 'scratch_pack_purchased':
        return <Gift size={20} />;
      case 'scratch_expiry_warning':
        return <AlertTriangle size={20} />;
      case 'scratch_expired':
        return <AlertCircle size={20} />;
      case 'system_alert':
        return <Bell size={20} />;
      case 'other':
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
            <button onClick={() => refetch()} className={styles.retryButton}>
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
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>
                {unreadCount} unread
              </span>
            )}
          </div>
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
