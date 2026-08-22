'use client';

import React, { useState } from 'react';
import {
  Store,
  CheckCircle2,
  Ban,
  MinusCircle,
  Search,
  AlertCircle,
} from 'lucide-react';
import { useAdminStoresQuery } from '@/hooks/queries/useAdminStoresQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin-stores.module.css';

function getInitials(name) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

export default function AdminStoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminStoresQuery({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  });

  const stores = data?.stores || [];
  const metrics = data?.metrics || { total: 0, active: 0, inactive: 0, suspended: 0 };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Stores</h1>
            <p>All stores across every retailer on the platform</p>
          </div>
        </div>

        <div className={styles.statGrid}>
          <StatCard icon={<Store />} value={metrics.total} label="Total Stores" />
          <StatCard icon={<CheckCircle2 />} value={metrics.active} label="Active" tone="green" />
          <StatCard icon={<MinusCircle />} value={metrics.inactive} label="Inactive" tone="gray" />
          <StatCard icon={<Ban />} value={metrics.suspended} label="Suspended" tone="red" />
        </div>

        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by store name, code, city, or state..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterTabs}>
            {['all', 'active', 'inactive', 'suspended'].map((tab) => (
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
          <LoadingState message="Loading stores..." />
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
                  <th>Store</th>
                  <th>Retailer</th>
                  <th>City</th>
                  <th>Store Manager</th>
                  <th>Campaigns</th>
                  <th>Customers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>
                      <Store size={32} />
                      <p>No stores found</p>
                    </td>
                  </tr>
                ) : (
                  stores.map((store) => (
                    <tr key={store._id}>
                      <td>
                        <div className={styles.storeInfo}>
                          <div className={styles.avatar}>{getInitials(store.store_name)}</div>
                          <div>
                            <p className={styles.name}>
                              {store.store_name}
                              {store.is_main_store && <span className={styles.mainBadge}>MAIN</span>}
                            </p>
                            <p className={styles.subtext}>{store.store_code || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{store.merchantName}</td>
                      <td>{store.city}, {store.state}</td>
                      <td>{store.storeManagerName || '—'}</td>
                      <td>{store.campaignCount}</td>
                      <td>{store.customerCount}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge-${store.status || 'active'}`]}`}>
                          {store.status || 'active'}
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
