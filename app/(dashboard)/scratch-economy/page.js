'use client';

import React, { useState } from 'react';
import {
  Ticket,
  TrendingDown,
  Gift,
  AlertTriangle,
  Search,
  AlertCircle,
} from 'lucide-react';
import { useAdminScratchInventoryQuery } from '@/hooks/queries/useAdminScratchInventoryQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './scratch-economy.module.css';

export default function ScratchEconomyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [lowBalanceFilter, setLowBalanceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminScratchInventoryQuery({
    search: searchQuery,
    lowBalance: lowBalanceFilter === 'low' ? 'true' : undefined,
    page,
    limit,
  });

  const merchants = data?.merchants || [];
  const totals = data?.totals || {
    allocated: 0,
    used: 0,
    remaining: 0,
    redeemed: 0,
    merchantCount: 0,
    lowBalanceCount: 0,
  };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Scratch Inventory</h1>
            <p>Scratch card allocation and usage across every retailer on the platform</p>
          </div>
        </div>

        <div className={styles.statGrid}>
          <StatCard icon={<Ticket />} value={totals.allocated.toLocaleString('en-IN')} label="Total Allocated" />
          <StatCard icon={<TrendingDown />} value={totals.used.toLocaleString('en-IN')} label="Total Used" />
          <StatCard icon={<Gift />} value={totals.remaining.toLocaleString('en-IN')} label="Total Remaining" tone="green" />
          <StatCard
            icon={<AlertTriangle />}
            value={totals.lowBalanceCount}
            label="Low Balance Accounts"
            tone="red"
            onClick={() => { setLowBalanceFilter('low'); setPage(1); }}
          />
        </div>

        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by retailer name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterTabs}>
            {[
              { value: 'all', label: 'All' },
              { value: 'low', label: 'Low Balance' },
            ].map((tab) => (
              <button
                key={tab.value}
                className={`${styles.filterTab} ${lowBalanceFilter === tab.value ? styles.active : ''}`}
                onClick={() => {
                  setLowBalanceFilter(tab.value);
                  setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading scratch inventory..." />
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
                  <th>Retailer</th>
                  <th>Total</th>
                  <th>Used</th>
                  <th>Redeemed</th>
                  <th>Remaining</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {merchants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>
                      <Ticket size={32} />
                      <p>No retailers found</p>
                    </td>
                  </tr>
                ) : (
                  merchants.map((m) => {
                    const percent = m.total > 0 ? Math.round((m.remaining / m.total) * 100) : 0;
                    return (
                      <tr key={m._id}>
                        <td>
                          <p className={styles.name}>{m.merchantName}</p>
                          <p className={styles.subtext}>{m.email}</p>
                        </td>
                        <td>{m.total.toLocaleString('en-IN')}</td>
                        <td>{m.used.toLocaleString('en-IN')}</td>
                        <td>{m.redeemed.toLocaleString('en-IN')}</td>
                        <td>{m.remaining.toLocaleString('en-IN')}</td>
                        <td>
                          <div className={styles.progressTrack}>
                            <div
                              className={`${styles.progressFill} ${m.isLowBalance ? styles.progressFillLow : ''}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${m.isLowBalance ? styles['badge-low'] : styles['badge-ok']}`}>
                            {m.isLowBalance ? 'Low' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
