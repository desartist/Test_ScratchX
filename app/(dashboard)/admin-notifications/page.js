'use client';

import React, { useState } from 'react';
import {
  Bell,
  Plus,
  AlertCircle,
  X,
  Info,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import {
  useAdminNotificationsQuery,
  useSendAnnouncementMutation,
} from '@/hooks/queries/useAdminNotificationsQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin-notifications.module.css';

const SEVERITY_ICON = {
  info: <Info />,
  low: <Bell />,
  medium: <AlertTriangle />,
  high: <AlertCircle />,
  critical: <ShieldAlert />,
};
const SEVERITY_TONE = {
  info: 'gray',
  low: 'indigo',
  medium: 'indigo',
  high: 'red',
  critical: 'red',
};

function formatDateTime(date) {
  return date
    ? new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
}

function ownerName(owner) {
  if (!owner) return '—';
  return owner.profile?.storeName || owner.profile?.companyName || owner.name || owner.email;
}

const SEVERITY_TABS = ['all', 'info', 'low', 'medium', 'high', 'critical'];

function AnnouncementModal({ onClose }) {
  const sendMutation = useSendAnnouncementMutation();
  const [audience, setAudience] = useState('merchants');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [formError, setFormError] = useState(null);
  const [sentCount, setSentCount] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim() || !message.trim()) {
      setFormError('Title and message are required');
      return;
    }
    try {
      const result = await sendMutation.mutateAsync({ audience, title, message, severity });
      setSentCount(result.sentCount);
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Send Announcement</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {formError && <div className={styles.formError}>{formError}</div>}
            {sentCount !== null && (
              <div className={styles.formSuccess}>
                Sent to {sentCount} account{sentCount === 1 ? '' : 's'}.
              </div>
            )}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Audience</label>
                <select className={styles.formSelect} value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <option value="merchants">All Retailers</option>
                  <option value="distributors">All Distributors</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Severity</label>
                <select className={styles.formSelect} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Title *</label>
              <input type="text" className={styles.formInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance tonight" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Message *</label>
              <textarea className={styles.formTextarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Details shown in the recipient's notification bell..." />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Close</button>
            <button type="submit" className={styles.submitButton} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminNotificationsQuery({
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    page,
    limit,
  });

  const notifications = data?.notifications || [];
  const metrics = data?.metrics || { total: 0, bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 0 } };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Notifications</h1>
            <p>Every notification sent across the platform</p>
          </div>
          <button className={styles.primaryButton} onClick={() => setShowAnnounceModal(true)}>
            <Plus size={16} />
            Send Announcement
          </button>
        </div>

        <div className={styles.statGrid}>
          {Object.entries(metrics.bySeverity).map(([sev, count]) => (
            <StatCard
              key={sev}
              icon={SEVERITY_ICON[sev] || <Bell />}
              value={count}
              label={sev.charAt(0).toUpperCase() + sev.slice(1)}
              tone={SEVERITY_TONE[sev] || 'indigo'}
            />
          ))}
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterTabs}>
            {SEVERITY_TABS.map((tab) => (
              <button
                key={tab}
                className={`${styles.filterTab} ${severityFilter === tab ? styles.active : ''}`}
                onClick={() => { setSeverityFilter(tab); setPage(1); }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading notifications..." />
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>Try Again</button>
          </div>
        ) : (
          <div className={styles.tableSection}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Read</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyState}>
                      <Bell size={32} />
                      <p>No notifications found</p>
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n._id}>
                      <td>
                        <p className={styles.notifTitle}>{n.title}</p>
                        <p className={styles.notifMessage}>{n.message}</p>
                      </td>
                      <td>{ownerName(n.ownerId)}</td>
                      <td>{n.type}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge-${n.severity}`] || ''}`}>{n.severity}</span>
                      </td>
                      <td>
                        {n.read ? <span className={styles.readBadge}>Read</span> : <span className={styles.unreadBadge}>Unread</span>}
                      </td>
                      <td>{formatDateTime(n.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageButton} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </button>
                <span className={styles.pageLabel}>Page {page} of {totalPages}</span>
                <button className={styles.pageButton} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAnnounceModal && <AnnouncementModal onClose={() => setShowAnnounceModal(false)} />}
    </div>
  );
}
