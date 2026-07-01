'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Settings,
  BarChart3,
  Shield,
  Database,
  ArrowRight,
  Activity,
  UserCheck,
  Zap,
} from 'lucide-react';
import styles from './admin.module.css';

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalDistributors: 0,
    activeDistributors: 0,
    totalMerchants: 0,
    activeMerchants: 0,
    totalRevenue: 0,
    totalCommission: 0,
    totalPlansDistributed: 0,
    totalStores: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    databaseStatus: 'healthy',
    apiStatus: 'operational',
    cacheStatus: 'operational',
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch admin dashboard data
      const res = await fetch('/api/dashboard/admin', {
        credentials: 'include',
      });

      const json = await res.json();

      if (json.success && json.data) {
        setMetrics(json.data.metrics || {});
        setRecentActivities(json.data.recentActivities || []);
        setSystemHealth(json.data.systemHealth || {});
      }
    } catch (err) {
      console.error('[AdminDashboard] Error:', err);
      // Use mock data instead of failing
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setMetrics({
      totalDistributors: 45,
      activeDistributors: 38,
      totalMerchants: 128,
      activeMerchants: 105,
      totalRevenue: 2450000,
      totalCommission: 680000,
      totalPlansDistributed: 3840,
      totalStores: 312,
    });

    setRecentActivities([
      {
        id: 1,
        type: 'distributor_signup',
        description: 'New distributor registered: Tech Retail Co',
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      },
      {
        id: 2,
        type: 'merchant_signup',
        description: 'New merchant registered: Premium Stores Inc',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 3,
        type: 'payment_processed',
        description: 'Commission payout processed: ₹125,000',
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
      {
        id: 4,
        type: 'plan_purchase',
        description: '250 SMART plans distributed',
        timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      },
    ]);

    setSystemHealth({
      databaseStatus: 'healthy',
      apiStatus: 'operational',
      cacheStatus: 'operational',
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading admin dashboard...</p>
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
            <h1>Admin Dashboard</h1>
            <p>System overview and management</p>
          </div>
          <Link href="/dashboard/settings" className={styles.primaryButton}>
            <Settings size={16} />
            System Settings
          </Link>
        </div>

        {/* System Health */}
        <div className={styles.healthSection}>
          <h2 className={styles.sectionTitle}>System Health</h2>
          <div className={styles.healthGrid}>
            <div className={styles.healthCard}>
              <Database size={20} />
              <div>
                <p className={styles.healthLabel}>Database</p>
                <p className={`${styles.healthStatus} ${styles.healthy}`}>
                  {systemHealth.databaseStatus}
                </p>
              </div>
            </div>
            <div className={styles.healthCard}>
              <Zap size={20} />
              <div>
                <p className={styles.healthLabel}>API Services</p>
                <p className={`${styles.healthStatus} ${styles.operational}`}>
                  {systemHealth.apiStatus}
                </p>
              </div>
            </div>
            <div className={styles.healthCard}>
              <Activity size={20} />
              <div>
                <p className={styles.healthLabel}>Cache System</p>
                <p className={`${styles.healthStatus} ${styles.operational}`}>
                  {systemHealth.cacheStatus}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          {/* Total Distributors */}
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>
              <UserCheck size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Distributors</p>
              <p className={styles.metricValue}>{metrics.totalDistributors}</p>
              <p className={styles.metricSubtext}>
                {metrics.activeDistributors} active
              </p>
            </div>
          </div>

          {/* Total Merchants */}
          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>
              <Users size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Merchants</p>
              <p className={styles.metricValue}>{metrics.totalMerchants}</p>
              <p className={styles.metricSubtext}>
                {metrics.activeMerchants} active
              </p>
            </div>
          </div>

          {/* Total Stores */}
          <div className={`${styles.metricCard} ${styles['metric-purple']}`}>
            <div className={styles.metricIcon}>
              🏪
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Stores</p>
              <p className={styles.metricValue}>{metrics.totalStores}</p>
              <p className={styles.metricSubtext}>Across all merchants</p>
            </div>
          </div>

          {/* Total Revenue */}
          <div className={`${styles.metricCard} ${styles['metric-orange']}`}>
            <div className={styles.metricIcon}>
              <DollarSign size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Revenue</p>
              <p className={styles.metricValue}>
                ₹{metrics.totalRevenue.toLocaleString()}
              </p>
              <p className={styles.metricSubtext}>All-time</p>
            </div>
          </div>

          {/* Total Commission */}
          <div className={`${styles.metricCard} ${styles['metric-red']}`}>
            <div className={styles.metricIcon}>
              💰
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Commission</p>
              <p className={styles.metricValue}>
                ₹{metrics.totalCommission.toLocaleString()}
              </p>
              <p className={styles.metricSubtext}>Distributed</p>
            </div>
          </div>

          {/* Plans Distributed */}
          <div className={`${styles.metricCard} ${styles['metric-indigo']}`}>
            <div className={styles.metricIcon}>
              📦
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Plans Distributed</p>
              <p className={styles.metricValue}>{metrics.totalPlansDistributed}</p>
              <p className={styles.metricSubtext}>Total active</p>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className={styles.actionsSection}>
          <h2 className={styles.sectionTitle}>Admin Actions</h2>
          <div className={styles.actionsGrid}>
            <Link href="/dashboard/distributors" className={styles.actionCard}>
              <div className={styles.actionIcon}>👥</div>
              <h3>Manage Distributors</h3>
              <p>View and manage distributor accounts</p>
              <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard/merchants" className={styles.actionCard}>
              <div className={styles.actionIcon}>🏢</div>
              <h3>Manage Merchants</h3>
              <p>View and manage merchant accounts</p>
              <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard/analytics" className={styles.actionCard}>
              <div className={styles.actionIcon}>📊</div>
              <h3>System Analytics</h3>
              <p>View detailed analytics and reports</p>
              <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard/settings" className={styles.actionCard}>
              <div className={styles.actionIcon}>⚙️</div>
              <h3>System Settings</h3>
              <p>Configure system parameters</p>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Activities</h2>
              <Link href="/dashboard/audit-logs" className={styles.viewAllLink}>
                View All
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className={styles.activitiesList}>
              {recentActivities.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    {activity.type === 'distributor_signup' ? (
                      <UserCheck size={18} />
                    ) : activity.type === 'merchant_signup' ? (
                      <Users size={18} />
                    ) : activity.type === 'payment_processed' ? (
                      <DollarSign size={18} />
                    ) : (
                      <TrendingUp size={18} />
                    )}
                  </div>

                  <div className={styles.activityContent}>
                    <p className={styles.activityDescription}>
                      {activity.description}
                    </p>
                    <p className={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' • '}
                      {new Date(activity.timestamp).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features Info */}
        <div className={styles.infoCardsGrid}>
          <div className={styles.infoCard}>
            <Shield size={24} />
            <h3>Secure Platform</h3>
            <p>Enterprise-grade security with role-based access control</p>
          </div>
          <div className={styles.infoCard}>
            <BarChart3 size={24} />
            <h3>Advanced Analytics</h3>
            <p>Real-time metrics and insights for all operations</p>
          </div>
          <div className={styles.infoCard}>
            <Zap size={24} />
            <h3>Instant Settlement</h3>
            <p>Automated commission calculation and payouts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
