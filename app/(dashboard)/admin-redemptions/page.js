'use client';

import React, { useState } from 'react';
import {
  QrCode,
  ScanLine,
  Gift,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAdminRedemptionsQuery } from '@/hooks/queries/useAdminRedemptionsQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin-redemptions.module.css';

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

const STATUS_TABS = ['all', 'initiated', 'verified', 'scratched', 'revealed', 'redeemed', 'expired'];

export default function AdminRedemptionsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminRedemptionsQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  });

  const redemptions = data?.redemptions || [];
  const metrics = data?.metrics || {
    totalCampaignsWithQr: 0,
    totalScans: 0,
    rewardsWon: 0,
    totalRedemptions: 0,
    conversionRate: 0,
  };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>QR &amp; Redemptions</h1>
            <p>Every campaign QR&apos;s scan-to-redemption journey, platform-wide</p>
          </div>
        </div>

        <div className={styles.flowNote}>
          <span className={styles.flowStep}>QR</span>
          <span className={styles.flowArrow}>→</span>
          <span className={styles.flowStep}>Store</span>
          <span className={styles.flowArrow}>→</span>
          <span className={styles.flowStep}>Campaign</span>
          <span className={styles.flowArrow}>→</span>
          <span className={styles.flowStep}>Scan</span>
          <span className={styles.flowArrow}>→</span>
          <span className={styles.flowStep}>Customer</span>
          <span className={styles.flowArrow}>→</span>
          <span className={styles.flowStep}>Scratch</span>
          <span className={styles.flowArrow}>→</span>
          <span className={styles.flowStep}>Reward</span>
          <span className={styles.flowArrow}>→</span>
          <span className={styles.flowStep}>Redemption</span>
        </div>

        <div className={styles.statGrid}>
          <StatCard icon={<QrCode />} value={metrics.totalCampaignsWithQr.toLocaleString('en-IN')} label="Campaign QR Codes" />
          <StatCard icon={<ScanLine />} value={metrics.totalScans.toLocaleString('en-IN')} label="Total Scans" />
          <StatCard icon={<Gift />} value={metrics.rewardsWon.toLocaleString('en-IN')} label="Rewards Won" />
          <StatCard icon={<CheckCircle2 />} value={metrics.totalRedemptions.toLocaleString('en-IN')} label={`Redeemed (${metrics.conversionRate}%)`} tone="green" />
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
          <LoadingState message="Loading redemptions..." />
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
                  <th>Campaign</th>
                  <th>Store</th>
                  <th>Reward</th>
                  <th>Status</th>
                  <th>Scanned</th>
                  <th>Redeemed</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>
                      <QrCode size={32} />
                      <p>No scan activity found</p>
                    </td>
                  </tr>
                ) : (
                  redemptions.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <span className={styles.maskedName}>{r.maskedName}</span>
                        <div className={styles.maskedMobile}>{r.maskedMobile}</div>
                      </td>
                      <td>{r.campaignName}</td>
                      <td>{r.storeName}</td>
                      <td>
                        {r.reward ? (
                          <span className={styles.rewardText}>{r.reward}</span>
                        ) : (
                          <span className={styles.noReward}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge-${r.status}`] || ''}`}>{r.status}</span>
                      </td>
                      <td>{formatDate(r.scannedAt)}</td>
                      <td>{formatDate(r.redeemedAt)}</td>
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
