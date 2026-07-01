'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Eye,
  MessageSquare,
  Trash2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import styles from './retailers.module.css';

export default function RetailersPage() {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    pending: 0,
    totalCommission: 0,
  });
  const [limit] = useState(20);

  useEffect(() => {
    fetchRetailers();
  }, [page, statusFilter, searchTerm]);

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        search: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const res = await fetch(`/api/distributor/retailers?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setRetailers(json.data.retailers || []);
      setMetrics({
        total: json.data.metrics?.total || 0,
        active: json.data.metrics?.active || 0,
        pending: json.data.metrics?.pending || 0,
        totalCommission: json.data.metrics?.totalCommission || 0,
      });
      setError(null);
    } catch (err) {
      console.error('[Retailers] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (retailerId) => {
    if (!confirm('Are you sure you want to remove this retailer?')) return;

    try {
      const res = await fetch(`/api/distributor/retailers/${retailerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setRetailers(retailers.filter((r) => r._id !== retailerId));
      alert('Retailer removed successfully');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading && retailers.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading retailers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Retailers Management</h1>
            <Link href="/distributor/retailers/create" className={styles.primaryButton}>
              <Plus size={20} />
              Add Retailer
            </Link>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchRetailers} className={styles.retryButton}>
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
            <h1>Retailers Management</h1>
            <p>Manage and monitor your retailers</p>
          </div>
          <Link href="/distributor/retailers/create" className={styles.primaryButton}>
            <Plus size={20} />
            Add Retailer
          </Link>
        </div>

        {/* Metrics */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>
              <Users size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Retailers</p>
              <p className={styles.metricValue}>{metrics.total}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>
              <Users size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Active Retailers</p>
              <p className={styles.metricValue}>{metrics.active}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-orange']}`}>
            <div className={styles.metricIcon}>
              <AlertCircle size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Pending</p>
              <p className={styles.metricValue}>{metrics.pending}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-purple']}`}>
            <div className={styles.metricIcon}>
              <Users size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Commission</p>
              <p className={styles.metricValue}>
                ₹{(metrics.totalCommission || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or city..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${statusFilter === 'all' ? styles.active : ''}`}
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
            >
              All
            </button>
            <button
              className={`${styles.filterTab} ${statusFilter === 'active' ? styles.active : ''}`}
              onClick={() => {
                setStatusFilter('active');
                setPage(1);
              }}
            >
              Active
            </button>
            <button
              className={`${styles.filterTab} ${statusFilter === 'pending' ? styles.active : ''}`}
              onClick={() => {
                setStatusFilter('pending');
                setPage(1);
              }}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Retailer Name</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th>Active Plans</th>
                <th>Total Sales</th>
                <th>Commission</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {retailers.length === 0 ? (
                <tr>
                  <td colSpan="8" className={styles.emptyState}>
                    <AlertCircle size={32} />
                    <p>No retailers found</p>
                    <Link href="/distributor/retailers/create" className={styles.createLink}>
                      Create your first retailer
                    </Link>
                  </td>
                </tr>
              ) : (
                retailers.map((retailer) => (
                  <tr key={retailer._id}>
                    <td>
                      <div className={styles.retailerInfo}>
                        <div className={styles.avatar}>
                          {retailer.businessName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={styles.name}>{retailer.businessName}</p>
                          <p className={styles.email}>{retailer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{retailer.phone}</td>
                    <td>{retailer.city}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[`badge-${retailer.status || 'pending'}`]}`}
                      >
                        {retailer.status === 'active' ? '✓' : '●'} {retailer.status || 'pending'}
                      </span>
                    </td>
                    <td>{retailer.activePlans || 0}</td>
                    <td>₹{(retailer.totalSales || 0).toLocaleString()}</td>
                    <td>
                      <span className={styles.commission}>
                        ₹{(retailer.commission || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/distributor/retailers/${retailer._id}`}
                          className={styles.actionBtn}
                          title="View Details"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/distributor/retailers/${retailer._id}/assign`}
                          className={styles.actionBtn}
                          title="Assign Plan"
                        >
                          <Plus size={18} />
                        </Link>
                        <button
                          className={`${styles.actionBtn} ${styles.danger}`}
                          onClick={() => handleDelete(retailer._id)}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {retailers.length > 0 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={styles.paginationBtn}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={retailers.length < limit}
              className={styles.paginationBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
