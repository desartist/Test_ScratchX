'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Filter,
  Search,
  Download,
  AlertCircle,
  Calendar,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import styles from './commissions.module.css';

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({
    totalEarned: 0,
    totalApproved: 0,
    totalPaid: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
  });
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    fetchCommissions();
    fetchSummary();
  }, [page, statusFilter, searchTerm]);

  // Auto-refetch commissions when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[Commissions] Page visible - refetching");
        setPage(1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const res = await fetch(`/api/distributor/commissions?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setCommissions(json.data.commissions || []);
      setError(null);
    } catch (err) {
      console.error('[Commissions] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/distributor/commissions?endpoint=summary', {
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success) {
        setSummary(json.data);
      }
    } catch (err) {
      console.error('[Summary] Error:', err);
    }
  };

  const handleExport = () => {
    alert('Commission export would generate CSV file');
  };

  if (loading && commissions.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading commissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Commissions & Analytics</h1>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchCommissions} className={styles.retryButton}>
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
            <h1>Commissions & Analytics</h1>
            <p>Track and manage your commission earnings</p>
          </div>
          <button onClick={handleExport} className={styles.primaryButton}>
            <Download size={20} />
            Export
          </button>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles['card-blue']}`}>
            <div className={styles.cardIcon}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardLabel}>Total Earned</p>
              <p className={styles.cardValue}>₹{(summary.totalEarned || 0).toLocaleString()}</p>
              <p className={styles.cardSubtext}>{summary.pendingCount} pending</p>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles['card-green']}`}>
            <div className={styles.cardIcon}>
              <CheckCircle size={24} />
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardLabel}>Total Approved</p>
              <p className={styles.cardValue}>₹{(summary.totalApproved || 0).toLocaleString()}</p>
              <p className={styles.cardSubtext}>{summary.approvedCount} approved</p>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles['card-purple']}`}>
            <div className={styles.cardIcon}>
              <DollarSign size={24} />
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardLabel}>Total Paid</p>
              <p className={styles.cardValue}>₹{(summary.totalPaid || 0).toLocaleString()}</p>
              <p className={styles.cardSubtext}>{summary.paidCount} paid</p>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles['card-orange']}`}>
            <div className={styles.cardIcon}>
              <BarChart3 size={24} />
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardLabel}>Pending Payout</p>
              <p className={styles.cardValue}>
                ₹{(summary.totalEarned - summary.totalPaid || 0).toLocaleString()}
              </p>
              <p className={styles.cardSubtext}>Ready to payout</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsSection}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'list' ? styles.active : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Commission List
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'payouts' ? styles.active : ''}`}
              onClick={() => setActiveTab('payouts')}
            >
              Payout History
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'list' && (
          <>
            {/* Filters */}
            <div className={styles.filterSection}>
              <div className={styles.searchBox}>
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search by retailer name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className={styles.searchInput}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="earned">Earned</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Table */}
            <div className={styles.tableSection}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Retailer</th>
                    <th>Amount</th>
                    <th>Percentage</th>
                    <th>Earned Date</th>
                    <th>Status</th>
                    <th>Payout Date</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.emptyState}>
                        <AlertCircle size={32} />
                        <p>No commissions found</p>
                      </td>
                    </tr>
                  ) : (
                    commissions.map((comm) => (
                      <tr key={comm._id}>
                        <td>
                          <div className={styles.retailerInfo}>
                            <span className={styles.retailerName}>{comm.retailerName || 'N/A'}</span>
                          </div>
                        </td>
                        <td className={styles.amount}>
                          ₹{(comm.commissionAmount || 0).toLocaleString()}
                        </td>
                        <td>{comm.commissionPercentage}%</td>
                        <td>
                          {new Date(comm.earnedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles[`badge-${comm.status}`]}`}>
                            {comm.status}
                          </span>
                        </td>
                        <td>
                          {comm.paidAt
                            ? new Date(comm.paidAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {commissions.length > 0 && (
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
                  disabled={commissions.length < limit}
                  className={styles.paginationBtn}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <div className={styles.analyticsSection}>
            <div className={styles.analyticsCard}>
              <h3>Commission Breakdown</h3>
              <div className={styles.breakdown}>
                <div className={styles.breakdownItem}>
                  <span>Earned</span>
                  <strong className={styles.earned}>₹{(summary.totalEarned || 0).toLocaleString()}</strong>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Approved</span>
                  <strong className={styles.approved}>₹{(summary.totalApproved || 0).toLocaleString()}</strong>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Paid</span>
                  <strong className={styles.paid}>₹{(summary.totalPaid || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className={styles.analyticsCard}>
              <h3>Monthly Trend</h3>
              <p className={styles.placeholderText}>Chart visualization coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className={styles.payoutsSection}>
            <div className={styles.payoutCard}>
              <h3>Recent Payouts</h3>
              <p className={styles.placeholderText}>No payout history available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
