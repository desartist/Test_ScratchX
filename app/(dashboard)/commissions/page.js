'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Search,
  Download,
  AlertCircle,
  BarChart3,
  CheckCircle,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useDistributorCommissionsQuery } from '@/hooks/queries/useDistributorCommissionsQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './commissions.module.css';

export default function CommissionsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  const { data, isPending: loading, error: queryError, refetch } = useDistributorCommissionsQuery({
    page,
    limit,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchTerm,
  });

  const commissions = data?.commissions || [];
  const summary = data?.summary || {
    totalEarned: 0,
    totalApproved: 0,
    totalPaid: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0,
    commissionRate: 0,
  };
  const error = queryError ? queryError.message : null;

  const handleExport = () => {
    alert('Commission export would generate CSV file');
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <LoadingState message="Loading commissions..." />
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
            <h1>Commissions & Analytics</h1>
            <p>Track and manage your commission earnings</p>
          </div>
          <button onClick={handleExport} className={styles.primaryButton}>
            <Download size={20} />
            Export
          </button>
        </div>

        {/* Commission Rate */}
        <div className={styles.rateBanner}>
          <div className={styles.rateBannerIcon}>
            <Percent size={26} />
          </div>
          <div className={styles.rateBannerContent}>
            <p className={styles.rateBannerLabel}>Your Commission Rate</p>
            <p className={styles.rateBannerValue}>{summary.commissionRate}%</p>
          </div>
          <p className={styles.rateBannerNote}>
            Set by ScratchX — applied to every merchant payment processed under your account
          </p>
        </div>

        {/* Summary Cards */}
        <div className={styles.statGrid}>
          <StatCard
            icon={<TrendingUp />}
            value={`₹${(summary.totalEarned || 0).toLocaleString('en-IN')}`}
            label="Total Earned"
            subtitle={`${summary.pendingCount} pending`}
          />
          <StatCard
            icon={<CheckCircle />}
            value={`₹${(summary.totalApproved || 0).toLocaleString('en-IN')}`}
            label="Total Approved"
            tone="green"
            subtitle={`${summary.approvedCount} approved`}
          />
          <StatCard
            icon={<DollarSign />}
            value={`₹${(summary.totalPaid || 0).toLocaleString('en-IN')}`}
            label="Total Paid"
            subtitle={`${summary.paidCount} paid`}
          />
          <StatCard
            icon={<BarChart3 />}
            value={`₹${Math.max(0, (summary.totalEarned || 0) - (summary.totalPaid || 0)).toLocaleString('en-IN')}`}
            label="Pending Payout"
            tone="red"
            subtitle="Ready to payout"
          />
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
                  placeholder="Search by merchant name..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Table */}
            <div className={styles.tableSection}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Amount</th>
                    <th>Rate</th>
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
                      <tr key={comm.id}>
                        <td>
                          <div className={styles.merchantInfo}>
                            <span className={styles.merchantName}>{comm.merchantName}</span>
                            {comm.merchantEmail && (
                              <span className={styles.merchantEmail}>{comm.merchantEmail}</span>
                            )}
                          </div>
                        </td>
                        <td className={styles.amount}>
                          ₹{(comm.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td>{comm.percentage != null ? `${comm.percentage}%` : '—'}</td>
                        <td>
                          {comm.earnedAt
                            ? new Date(comm.earnedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
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
                            : '—'}
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
                  <strong className={styles.earned}>₹{(summary.totalEarned || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Approved</span>
                  <strong className={styles.approved}>₹{(summary.totalApproved || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Paid</span>
                  <strong className={styles.paid}>₹{(summary.totalPaid || 0).toLocaleString('en-IN')}</strong>
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
              {summary.paidCount > 0 ? (
                <p className={styles.placeholderText}>
                  {summary.paidCount} payout{summary.paidCount === 1 ? '' : 's'} totaling ₹
                  {(summary.totalPaid || 0).toLocaleString('en-IN')}. Detailed payout history coming soon.
                </p>
              ) : (
                <p className={styles.placeholderText}>No payout history available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
