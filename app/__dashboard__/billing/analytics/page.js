'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import styles from './page.module.css';

export default function ScratchAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30days');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/billing/scratch-analytics?period=${period}&includeBreakdown=true`
        );
        const json = await res.json();

        if (!json.success) {
          setError(json.error || 'Failed to load analytics');
          return;
        }

        setAnalytics(json.analytics);
        setError(null);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>No Data Available</h2>
          <p>Start creating campaigns to see analytics.</p>
        </div>
      </div>
    );
  }

  const consumptionColor = analytics.consumptionRate > 75 ? '#ef4444' : analytics.consumptionRate > 50 ? '#f97316' : '#0a8905';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Scratch Analytics</h1>
        <div className={styles.periodSelector}>
          <button
            className={period === '7days' ? styles.active : ''}
            onClick={() => setPeriod('7days')}
          >
            7 Days
          </button>
          <button
            className={period === '30days' ? styles.active : ''}
            onClick={() => setPeriod('30days')}
          >
            30 Days
          </button>
          <button
            className={period === '90days' ? styles.active : ''}
            onClick={() => setPeriod('90days')}
          >
            90 Days
          </button>
          <button
            className={period === 'all' ? styles.active : ''}
            onClick={() => setPeriod('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <h3>Total Purchased</h3>
          <div className={styles.metricValue}>
            {analytics.totalPurchased.toLocaleString()}
          </div>
          <p>Scratches purchased across all packs</p>
        </div>

        <div className={styles.metricCard}>
          <h3>Total Consumed</h3>
          <div className={styles.metricValue} style={{ color: consumptionColor }}>
            {analytics.totalConsumed.toLocaleString()}
          </div>
          <p>Used in campaigns</p>
        </div>

        <div className={styles.metricCard}>
          <h3>Remaining Balance</h3>
          <div className={styles.metricValue} style={{ color: '#0a8905' }}>
            {analytics.totalRemaining.toLocaleString()}
          </div>
          <p>Available for use</p>
        </div>

        <div className={styles.metricCard}>
          <h3>Consumption Rate</h3>
          <div className={styles.metricValue} style={{ color: consumptionColor }}>
            {analytics.consumptionRate}%
          </div>
          <p>Of purchased scratches used</p>
        </div>
      </div>

      {/* Unlimited Scratches Status */}
      {analytics.unlimitedStatus && (
        <div className={styles.unlimitedCard}>
          <h2>Unlimited Scratches</h2>
          <div className={styles.unlimitedStatus}>
            <div>
              <strong>Status:</strong> Active
            </div>
            <div>
              <strong>Days Remaining:</strong> {analytics.unlimitedStatus.daysRemaining} days
            </div>
            <div>
              <strong>Expires:</strong> {new Date(analytics.unlimitedStatus.validUntil).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Consumption Chart */}
      {analytics.dailyUsage.length > 0 && (
        <div className={styles.chartSection}>
          <h2>Daily Usage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="scratches_used"
                stroke="#ef9e1b"
                name="Scratches Used"
              />
              <Line
                type="monotone"
                dataKey="campaigns_created"
                stroke="#00b0b1"
                name="Campaigns Created"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pack Breakdown */}
      {analytics.packBreakdown && analytics.packBreakdown.length > 0 && (
        <div className={styles.packSection}>
          <h2>Scratch Pack Breakdown</h2>
          <div className={styles.packGrid}>
            {analytics.packBreakdown.map((pack) => (
              <div key={pack.packId} className={styles.packCard}>
                <div className={styles.packHeader}>
                  <h3>{pack.packName}</h3>
                  <span className={styles.packStatus}>{pack.status}</span>
                </div>
                <div className={styles.packStats}>
                  <div className={styles.statRow}>
                    <span>Purchased:</span>
                    <strong>{pack.purchased.toLocaleString()}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Consumed:</span>
                    <strong>{pack.consumed.toLocaleString()}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Remaining:</span>
                    <strong>{pack.remaining.toLocaleString()}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Usage Rate:</span>
                    <strong>{pack.consumptionPercentage}%</strong>
                  </div>
                </div>
                <div className={styles.packProgress}>
                  <div
                    className={styles.progressBar}
                    style={{
                      width: `${pack.consumptionPercentage}%`,
                      backgroundColor:
                        pack.consumptionPercentage > 75
                          ? '#ef4444'
                          : pack.consumptionPercentage > 50
                          ? '#f97316'
                          : '#0a8905',
                    }}
                  ></div>
                </div>
                <p className={styles.packExpiry}>
                  Expires: {new Date(pack.expiresAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {analytics.trends && (
        <div className={styles.trendsSection}>
          <h2>Trends & Projections</h2>
          <div className={styles.trendsGrid}>
            <div className={styles.trendCard}>
              <h3>Average Daily Usage</h3>
              <div className={styles.trendValue}>
                {analytics.trends.averageDailyUsage.toLocaleString()}
              </div>
              <p>scratches per day</p>
            </div>
            {analytics.trends.projectedExhaustionDate && (
              <div className={styles.trendCard}>
                <h3>Projected Exhaustion</h3>
                <div className={styles.trendValue}>
                  {new Date(analytics.trends.projectedExhaustionDate).toLocaleDateString()}
                </div>
                <p>when scratches will run out</p>
              </div>
            )}
            <div className={styles.trendCard}>
              <h3>Total Campaigns</h3>
              <div className={styles.trendValue}>
                {analytics.trends.totalCampaignsInPeriod}
              </div>
              <p>in this period</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
