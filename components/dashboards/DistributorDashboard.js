'use client';

import React from 'react';
import StatCard from './shared/StatCard';
import styles from './Dashboard.module.css';

export default function DistributorDashboard({ data: propData }) {
  // Use data from parent prop
  const data = propData || null;

  if (!data) {
    return <div className={styles.empty}>Dashboard data unavailable</div>;
  }

  // Calculate balance usage percentage
  const totalAllocated = data?.balance?.totalAllocated || 0;
  const usedBalance = data?.balance?.usedBalance || 0;
  const remainingBalance = data?.balance?.remainingBalance || 0;
  const usagePercentage = totalAllocated > 0 ? Math.round((usedBalance / totalAllocated) * 100) : 0;

  return (
    <div className={styles.dashboard}>
      {/* Header Section */}
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>Distributor Dashboard</h1>
        <p className={styles.dashboardSubtitle}>Manage your subscriptions and merchant allocations</p>
      </div>

      {/* Main Content */}
      <div className={styles.dashboardContent}>
        {/* Key Metrics Stats Grid */}
        <div className={styles.statsGrid}>
          <StatCard
            title="Active Merchants"
            value={data?.merchantCount || 0}
            unit=""
            variant="primary"
            size="medium"
          />
          <StatCard
            title="Total Allocations"
            value={data?.balance?.allocationCount || 0}
            unit=""
            variant="success"
            size="medium"
          />
          <StatCard
            title="Plan Tier"
            value={data?.plan?.tier || 0}
            unit=""
            variant="default"
            size="medium"
          />
          <StatCard
            title="Subscription Status"
            value={data?.subscription?.status || 'N/A'}
            unit=""
            variant="warning"
            size="medium"
          />
        </div>

        {/* Subscription Section */}
        <div className={styles.subscriptionSection}>
          <div className={styles.subscriptionCard}>
            <h3 className={styles.sectionTitle}>Subscription Details</h3>
            <div className={styles.subscriptionDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Plan Name:</span>
                <span className={styles.detailValue}>{data?.subscription?.planName || 'N/A'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <span className={styles.detailValue}>{data?.subscription?.status || 'N/A'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Billing Cycle:</span>
                <span className={styles.detailValue}>{data?.subscription?.billingCycle || 'N/A'}</span>
              </div>
              {data?.subscription?.startDate && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Start Date:</span>
                  <span className={styles.detailValue}>
                    {new Date(data.subscription.startDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {data?.subscription?.endDate && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>End Date:</span>
                  <span className={styles.detailValue}>
                    {new Date(data.subscription.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Balance Section */}
        <div className={styles.balanceSection}>
          <div className={styles.balanceLeft}>
            <h3 className={styles.inventoryTitle}>Allocation Balance</h3>
            <div className={styles.inventoryNumber}>
              {remainingBalance.toLocaleString()}
            </div>
            <p className={styles.inventoryLabel}>Remaining Balance</p>
          </div>
          <div className={styles.balanceRight}>
            <div className={styles.usedCount}>
              {usedBalance.toLocaleString()} Used
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
            <div className={styles.percentage}>
              {usagePercentage}%
            </div>
          </div>
        </div>

        {/* Plan Limits Section */}
        <div className={styles.planLimitsSection}>
          <h3 className={styles.sectionTitle}>Plan Limits</h3>
          <div className={styles.planLimitsGrid}>
            <div className={styles.limitCard}>
              <span className={styles.limitLabel}>Max Merchants</span>
              <span className={styles.limitValue}>
                {data?.plan?.maxMerchants === 'Unlimited' ? '∞' : data?.plan?.maxMerchants}
              </span>
            </div>
            <div className={styles.limitCard}>
              <span className={styles.limitLabel}>Max Stores</span>
              <span className={styles.limitValue}>
                {data?.plan?.maxStores === 'Unlimited' ? '∞' : data?.plan?.maxStores}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Allocations Section */}
        {data?.recentAllocations && data.recentAllocations.length > 0 && (
          <div className={styles.allocationsSection}>
            <h3 className={styles.sectionTitle}>Recent Allocations</h3>
            <div className={styles.allocationsTable}>
              <div className={styles.tableHeader}>
                <div className={styles.tableCell}>Merchant Name</div>
                <div className={styles.tableCell}>Quantity</div>
                <div className={styles.tableCell}>Status</div>
                <div className={styles.tableCell}>Allocated Date</div>
              </div>
              {data.recentAllocations.map((allocation, index) => (
                <div key={index} className={styles.tableRow}>
                  <div className={styles.tableCell}>{allocation.merchantName}</div>
                  <div className={styles.tableCell}>{allocation.quantity.toLocaleString()}</div>
                  <div className={styles.tableCell}>
                    <span className={styles[`status-${allocation.status}`]}>
                      {allocation.status}
                    </span>
                  </div>
                  <div className={styles.tableCell}>
                    {new Date(allocation.allocatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Allocations Message */}
        {(!data?.recentAllocations || data.recentAllocations.length === 0) && (
          <div className={styles.emptySection}>
            <p>No recent allocations to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
