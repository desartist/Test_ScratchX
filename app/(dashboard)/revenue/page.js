'use client';

import React, { useState } from 'react';
import {
  IndianRupee,
  TrendingUp,
  Receipt,
  AlertCircle,
  FileWarning,
} from 'lucide-react';
import { useAdminAnalyticsQuery } from '@/hooks/queries/useAdminAnalyticsQuery';
import styles from './revenue.module.css';

const RANGE_OPTIONS = [
  { label: '30 Days', value: 30 },
  { label: '60 Days', value: 60 },
  { label: '90 Days', value: 90 },
];

export default function RevenueAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isPending, error, refetch } = useAdminAnalyticsQuery(days);

  if (isPending) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading revenue analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error.message}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { revenue, invoices, subscriptions } = data;
  const maxDayRevenue = Math.max(1, ...revenue.byDay.map((d) => d.revenue));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Revenue Analytics</h1>
            <p>Platform-wide revenue, invoicing, and subscription performance</p>
          </div>
          <div className={styles.filterTabs}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.filterTab} ${days === opt.value ? styles.active : ''}`}
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>
              <IndianRupee size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Revenue</p>
              <p className={styles.metricValue}>
                ₹{Number(revenue.total).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>
              <Receipt size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Transactions</p>
              <p className={styles.metricValue}>{revenue.transactions}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-purple']}`}>
            <div className={styles.metricIcon}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Avg. Transaction</p>
              <p className={styles.metricValue}>
                ₹{Number(revenue.average).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-orange']}`}>
            <div className={styles.metricIcon}>
              <FileWarning size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Outstanding Invoices</p>
              <p className={styles.metricValue}>
                ₹{Number(invoices.totalOutstanding).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Revenue trend */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Revenue Trend</h2>
          {revenue.byDay.length === 0 ? (
            <p className={styles.emptyInline}>No revenue recorded in this period.</p>
          ) : (
            <div className={styles.trendChart}>
              {revenue.byDay.map((d) => (
                <div key={d._id} className={styles.trendBarWrap} title={`₹${d.revenue.toLocaleString('en-IN')} on ${d._id}`}>
                  <div
                    className={styles.trendBar}
                    style={{ height: `${Math.max(4, (d.revenue / maxDayRevenue) * 100)}%` }}
                  />
                  <span className={styles.trendBarLabel}>{d._id.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.twoColGrid}>
          {/* Revenue by plan */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Revenue by Plan</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Revenue</th>
                  <th>Transactions</th>
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                {revenue.byPlan.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.emptyState}>
                      No plan revenue in this period
                    </td>
                  </tr>
                ) : (
                  revenue.byPlan.map((p) => (
                    <tr key={p.plan}>
                      <td>{p.plan || 'Unknown'}</td>
                      <td>₹{Number(p.revenue).toLocaleString('en-IN')}</td>
                      <td>{p.transactions}</td>
                      <td>₹{Number(p.average).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subscription breakdown */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Active Subscriptions by Plan</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Count</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.byPlan.length === 0 ? (
                  <tr>
                    <td colSpan="3" className={styles.emptyState}>
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subscriptions.byPlan.map((p) => (
                    <tr key={p.plan}>
                      <td>{p.plan || 'Unknown'}</td>
                      <td>{p.count}</td>
                      <td>{p.percentage}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoices */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Invoices</h2>
          <div className={styles.invoiceSummary}>
            <div>
              <p className={styles.metricLabel}>Total</p>
              <p className={styles.metricValue}>{invoices.total}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>Paid</p>
              <p className={styles.metricValue}>{invoices.paid}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>Outstanding</p>
              <p className={styles.metricValue}>{invoices.outstanding}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
