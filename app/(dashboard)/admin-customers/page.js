'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Repeat,
  Gift,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAdminCustomersQuery } from '@/hooks/queries/useAdminCustomersQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin-customers.module.css';

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

const STATUS_TABS = ['all', 'initiated', 'verified', 'scratched', 'revealed', 'redeemed', 'expired'];

export default function AdminCustomersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminCustomersQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  });

  const customers = data?.customers || [];
  const metrics = data?.metrics || {
    totalCustomers: 0,
    newCustomers30d: 0,
    returningCustomers: 0,
    redemptionRate: 0,
    totalParticipations: 0,
  };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Customers</h1>
            <p>Customer engagement across every retailer on the platform</p>
          </div>
        </div>

        <div className={styles.privacyNote}>
          <ShieldCheck size={16} />
          Customer identity is masked here to protect privacy — full details remain visible only to the owning retailer.
        </div>

        <div className={styles.statGrid}>
          <StatCard icon={<Users />} value={metrics.totalCustomers.toLocaleString('en-IN')} label="Total Customers" />
          <StatCard icon={<UserPlus />} value={metrics.newCustomers30d.toLocaleString('en-IN')} label="New (30d)" tone="green" />
          <StatCard icon={<Repeat />} value={metrics.returningCustomers.toLocaleString('en-IN')} label="Returning" />
          <StatCard icon={<Gift />} value={`${metrics.redemptionRate}%`} label="Redemption Rate" />
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterTabs}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                className={`${styles.filterTab} ${statusFilter === tab ? styles.active : ''}`}
                onClick={() => { setStatusFilter(tab); setPage(1); }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading customers..." />
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
                  <th>Customer</th>
                  <th>Store</th>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyState}>
                      <Users size={32} />
                      <p>No customer activity found</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <span className={styles.maskedName}>{c.maskedName}</span>
                        {c.isRepeatCustomer && <span className={styles.repeatBadge}>Repeat</span>}
                        <div className={styles.maskedMobile}>{c.maskedMobile}</div>
                      </td>
                      <td>{c.storeName}</td>
                      <td>{c.campaignName}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge-${c.status}`] || ''}`}>{c.status}</span>
                      </td>
                      <td>{formatDate(c.date)}</td>
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
    </div>
  );
}
