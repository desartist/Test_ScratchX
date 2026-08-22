'use client';

import React, { useState } from 'react';
import {
  Megaphone,
  Zap,
  ScanLine,
  Users,
  Search,
  AlertCircle,
} from 'lucide-react';
import { useAdminCampaignsQuery } from '@/hooks/queries/useAdminCampaignsQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './campaign-intelligence.module.css';

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

export default function CampaignIntelligencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminCampaignsQuery({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  });

  const campaigns = data?.campaigns || [];
  const metrics = data?.metrics || { total: 0, active: 0, paused: 0, ended: 0 };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Campaigns</h1>
            <p>Every campaign running across the platform, with performance at a glance</p>
          </div>
        </div>

        <div className={styles.statGrid}>
          <StatCard icon={<Megaphone />} value={metrics.total} label="Total Campaigns" />
          <StatCard icon={<Zap />} value={metrics.active} label="Live" tone="green" />
          <StatCard icon={<Users />} value={metrics.paused} label="Paused" />
          <StatCard icon={<ScanLine />} value={metrics.ended} label="Ended" tone="gray" />
        </div>

        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by campaign name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterTabs}>
            {['all', 'active', 'paused', 'ended', 'draft'].map((tab) => (
              <button
                key={tab}
                className={`${styles.filterTab} ${statusFilter === tab ? styles.active : ''}`}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading campaigns..." />
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        ) : (
          <div className={styles.tableSection}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Retailer</th>
                  <th>Stores</th>
                  <th>Dates</th>
                  <th>QR Scans</th>
                  <th>Participations</th>
                  <th>Scratches (Used/Allocated)</th>
                  <th>Redemptions</th>
                  <th>Conversion</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan="10" className={styles.emptyState}>
                      <Megaphone size={32} />
                      <p>No campaigns found</p>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <p className={styles.campaignName}>{c.name}</p>
                      </td>
                      <td>{c.merchantName}</td>
                      <td>{c.storeCount}</td>
                      <td>
                        <p className={styles.subtext}>{formatDate(c.startDate)} – {formatDate(c.endDate)}</p>
                      </td>
                      <td>{c.qrScans.toLocaleString('en-IN')}</td>
                      <td>{c.participations.toLocaleString('en-IN')}</td>
                      <td>{c.used.toLocaleString('en-IN')} / {c.allocated.toLocaleString('en-IN')}</td>
                      <td>{c.redemptionCount.toLocaleString('en-IN')}</td>
                      <td>{c.conversionRate ? `${c.conversionRate.toFixed(1)}%` : '—'}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge-${c.status || 'draft'}`]}`}>
                          {c.status || 'draft'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageButton}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className={styles.pageLabel}>Page {page} of {totalPages}</span>
                <button
                  className={styles.pageButton}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
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
