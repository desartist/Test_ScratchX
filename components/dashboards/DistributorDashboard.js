'use client';

import React from 'react';
import { TrendingUp, Users, ShoppingCart, Zap, Award, AlertCircle } from 'lucide-react';
import styles from './DistributorDashboard.module.css';

export default function DistributorDashboard({ data: propData }) {
  const data = propData || null;

  if (!data) {
    return (
      <div className={styles.emptyState}>
        <AlertCircle size={48} />
        <p>Dashboard data unavailable</p>
      </div>
    );
  }

  const totalAllocated = data?.balance?.totalAllocated || 0;
  const usedBalance = data?.balance?.usedBalance || 0;
  const remainingBalance = data?.balance?.remainingBalance || 0;
  const usagePercentage = totalAllocated > 0 ? Math.round((usedBalance / totalAllocated) * 100) : 0;

  const metrics = [
    {
      title: 'Active Merchants',
      value: data?.merchantCount || 0,
      icon: <Users size={24} />,
      color: 'blue',
      subtext: 'Under your distribution',
    },
    {
      title: 'Total Allocations',
      value: (data?.balance?.allocationCount || 0).toLocaleString(),
      icon: <ShoppingCart size={24} />,
      color: 'green',
      subtext: 'Allocated to merchants',
    },
    {
      title: 'Remaining Balance',
      value: remainingBalance.toLocaleString(),
      icon: <Award size={24} />,
      color: 'purple',
      subtext: `${usagePercentage}% utilized`,
    },
    {
      title: 'Subscription Status',
      value: data?.subscription?.status || 'N/A',
      icon: <Zap size={24} />,
      color: data?.subscription?.status === 'active' ? 'success' : 'warning',
      subtext: data?.subscription?.planName || 'No active plan',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Distributor Dashboard</h1>
            <p className={styles.subtitle}>Manage subscriptions, merchants & allocations</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          {metrics.map((metric, idx) => (
            <div key={idx} className={`${styles.metricCard} ${styles[`metric-${metric.color}`]}`}>
              <div className={styles.metricIcon}>{metric.icon}</div>
              <div className={styles.metricContent}>
                <p className={styles.metricLabel}>{metric.title}</p>
                <p className={styles.metricValue}>{metric.value}</p>
                <p className={styles.metricSubtext}>{metric.subtext}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Subscription Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Plan Details</h2>
              <span className={`${styles.statusBadge} ${styles[`status-${data?.subscription?.status?.toLowerCase()}`]}`}>
                {(data?.subscription?.status || 'inactive').toUpperCase()}
              </span>
            </div>
            <div className={styles.subscriptionDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Plan Name</span>
                <span className={styles.detailValue}>{data?.subscription?.planName || 'N/A'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Billing Cycle</span>
                <span className={styles.detailValue}>{data?.subscription?.billingCycle || 'N/A'}</span>
              </div>
              {data?.subscription?.startDate && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Start Date</span>
                  <span className={styles.detailValue}>
                    {new Date(data.subscription.startDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {data?.subscription?.endDate && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>End Date</span>
                  <span className={styles.detailValue}>
                    {new Date(data.subscription.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Plan Limits Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Plan Limits</h2>
            <div className={styles.limitsGrid}>
              <div className={styles.limitItem}>
                <span className={styles.limitLabel}>Max Merchants</span>
                <span className={styles.limitValue}>
                  {data?.plan?.maxMerchants === 'Unlimited' || data?.plan?.maxMerchants > 999 ? '∞' : data?.plan?.maxMerchants}
                </span>
              </div>
              <div className={styles.limitItem}>
                <span className={styles.limitLabel}>Max Stores</span>
                <span className={styles.limitValue}>
                  {data?.plan?.maxStores === 'Unlimited' || data?.plan?.maxStores > 999 ? '∞' : data?.plan?.maxStores}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Allocation Balance</h2>
          <div className={styles.balanceContainer}>
            <div className={styles.balanceLeft}>
              <div className={styles.balanceItem}>
                <p className={styles.balanceLabel}>Total Allocated</p>
                <p className={styles.balanceAmount}>{totalAllocated.toLocaleString()}</p>
              </div>
              <div className={styles.balanceItem}>
                <p className={styles.balanceLabel}>Currently Used</p>
                <p className={styles.balanceAmount} style={{ color: '#ef4444' }}>
                  {usedBalance.toLocaleString()}
                </p>
              </div>
            </div>

            <div className={styles.balanceRight}>
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>Usage</span>
                  <span className={styles.progressPercent}>{usagePercentage}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${usagePercentage}%`,
                      backgroundColor: usagePercentage > 80 ? '#ef4444' : usagePercentage > 60 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <p className={styles.remainingText}>
                  <strong>{remainingBalance.toLocaleString()}</strong> remaining
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Allocations */}
        {data?.recentAllocations && data.recentAllocations.length > 0 ? (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Recent Allocations</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Merchant Name</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Allocated Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAllocations.map((allocation, idx) => (
                    <tr key={idx} className={styles.tableRow}>
                      <td className={styles.merchantCell}>
                        <span className={styles.merchantName}>{allocation.merchantName}</span>
                      </td>
                      <td>{allocation.quantity.toLocaleString()}</td>
                      <td>
                        <span className={`${styles.statusTag} ${styles[`status-${allocation.status.toLowerCase()}`]}`}>
                          {allocation.status}
                        </span>
                      </td>
                      <td>{new Date(allocation.allocatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={styles.emptyCard}>
            <AlertCircle size={40} />
            <p>No recent allocations to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
