'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, ScrollText } from 'lucide-react';
import { useAdminAuditLogsQuery } from '@/hooks/queries/useAdminAuditLogsQuery';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin-audit-logs.module.css';

function formatDateTime(date) {
  return date
    ? new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
}

export default function AdminAuditLogsPage() {
  const [moduleFilter, setModuleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isPending: loading, error: queryError, refetch } = useAdminAuditLogsQuery({
    module: moduleFilter !== 'all' ? moduleFilter : undefined,
    page,
    limit,
  });

  const logs = data?.logs || [];
  const metrics = data?.metrics || { total: 0, byModule: [] };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  const moduleTabs = ['all', ...metrics.byModule.map((m) => m.module)];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Audit Logs</h1>
          <p>Every Super Admin action across the platform — who, what, when, and target</p>
        </div>

        <div className={styles.immutableNote}>
          <ShieldCheck size={16} />
          This log is immutable — no edit or delete action exists anywhere in the admin panel for these records.
        </div>

        {moduleTabs.length > 1 && (
          <div className={styles.filterSection}>
            <div className={styles.filterTabs}>
              {moduleTabs.map((m) => (
                <button
                  key={m}
                  className={`${styles.filterTab} ${moduleFilter === m ? styles.active : ''}`}
                  onClick={() => { setModuleFilter(m); setPage(1); }}
                >
                  {m === 'all' ? 'All' : m}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading audit logs..." />
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>Try Again</button>
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState}>
            <ScrollText size={32} />
            <p>No audit log entries found</p>
          </div>
        ) : (
          <>
            <div className={styles.timeline}>
              {logs.map((log) => (
                <div key={log._id} className={styles.logCard}>
                  <div className={styles.logHeader}>
                    <div>
                      <p className={styles.logAction}>{log.action}</p>
                      <p className={styles.logMeta}>
                        {log.adminName} ({log.adminRole}) · {formatDateTime(log.createdAt)}
                        {log.ip ? ` · ${log.ip}` : ''}
                      </p>
                    </div>
                    <span className={styles.moduleBadge}>{log.module}</span>
                  </div>
                  {log.targetLabel && (
                    <p className={styles.logTarget}>
                      Target: <strong>{log.targetLabel}</strong>
                    </p>
                  )}
                  {log.reason && <p className={styles.logReason}>&quot;{log.reason}&quot;</p>}
                </div>
              ))}
            </div>
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
          </>
        )}
      </div>
    </div>
  );
}
