'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  AlertCircle,
  Zap,
  Package,
  ArrowRight,
  Eye,
  Download,
} from 'lucide-react';
import styles from './distributor.module.css';

export default function DistributorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/distributor/dashboard', {
        credentials: 'include',
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load dashboard');
      }

      setDashboard(data.data);
      setError(null);
    } catch (err) {
      console.error('[Dashboard] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertCircle size={48} />
          <p>{error}</p>
          <button onClick={fetchDashboard} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const { metrics, inventory, commission, orders, alerts, stats } = dashboard;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Distributor Dashboard</h1>
            <p className={styles.subtitle}>Manage plans, retailers & commissions</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/distributor/marketplace" className={styles.primaryButton}>
              <ShoppingCart size={20} />
              Buy Plans
            </Link>
            <Link href="/distributor/retailers/create" className={styles.secondaryButton}>
              <Users size={20} />
              Add Retailer
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className={styles.alertsSection}>
            {alerts.map((alert, idx) => (
              <div key={idx} className={styles.alertBox}>
                <AlertCircle size={20} />
                <div className={styles.alertContent}>
                  <p className={styles.alertTitle}>{alert.message}</p>
                  <p className={styles.alertDetail}>
                    {alert.remaining} remaining ({alert.utilization}% utilized)
                  </p>
                </div>
                <Link href="/distributor/marketplace" className={styles.alertAction}>
                  Buy More
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Main Metrics */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>
              <DollarSign size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Current Balance</p>
              <p className={styles.metricValue}>
                ₹{(metrics.currentBalance || 0).toLocaleString()}
              </p>
              <p className={styles.metricSubtext}>Available credit</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>
              <Package size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Remaining Plans</p>
              <p className={styles.metricValue}>{metrics.remainingPlans}</p>
              <p className={styles.metricSubtext}>
                {((metrics.remainingPlans / metrics.totalPlansInventory) * 100 || 0).toFixed(0)}% of inventory
              </p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-purple']}`}>
            <div className={styles.metricIcon}>
              <Users size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Active Retailers</p>
              <p className={styles.metricValue}>{metrics.totalRetailers}</p>
              <p className={styles.metricSubtext}>Using your plans</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-orange']}`}>
            <div className={styles.metricIcon}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Monthly Profit</p>
              <p className={styles.metricValue}>
                ₹{(metrics.monthlyProfit || 0).toLocaleString()}
              </p>
              <p className={styles.metricSubtext}>Commissions earned</p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className={styles.contentGrid}>
          {/* Inventory Status */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Plan Inventory</h2>
              <Link href="/distributor/inventory" className={styles.viewLink}>
                View All
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.inventoryGrid}>
              <div className={styles.inventoryItem}>
                <span className={styles.planName}>Core Plans</span>
                <div className={styles.inventoryStats}>
                  <div className={styles.statRow}>
                    <span>Purchased:</span>
                    <strong>{inventory.core.totalPurchased}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Assigned:</span>
                    <strong>{inventory.core.totalAssigned}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Remaining:</span>
                    <strong className={styles.remaining}>
                      {inventory.core.totalRemaining}
                    </strong>
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${inventory.core.percentageUtilized}%`,
                      backgroundColor:
                        inventory.core.percentageUtilized > 80 ? '#ef4444' : '#3b82f6',
                    }}
                  />
                </div>
                <p className={styles.utilization}>
                  {inventory.core.percentageUtilized}% utilized
                </p>
              </div>

              <div className={styles.inventoryItem}>
                <span className={styles.planName}>Smart Plans</span>
                <div className={styles.inventoryStats}>
                  <div className={styles.statRow}>
                    <span>Purchased:</span>
                    <strong>{inventory.smart.totalPurchased}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Assigned:</span>
                    <strong>{inventory.smart.totalAssigned}</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Remaining:</span>
                    <strong className={styles.remaining}>
                      {inventory.smart.totalRemaining}
                    </strong>
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${inventory.smart.percentageUtilized}%`,
                      backgroundColor:
                        inventory.smart.percentageUtilized > 80 ? '#ef4444' : '#8b5cf6',
                    }}
                  />
                </div>
                <p className={styles.utilization}>
                  {inventory.smart.percentageUtilized}% utilized
                </p>
              </div>
            </div>
          </div>

          {/* Commission Status */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Commission Status</h2>
              <Link href="/distributor/commissions" className={styles.viewLink}>
                View All
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.commissionBreakdown}>
              <div className={styles.commissionItem}>
                <div className={styles.commissionLabel}>
                  <span>Earned</span>
                  <span className={styles.commissionCount}>
                    ({commission.pending})
                  </span>
                </div>
                <p className={styles.commissionAmount}>
                  ₹{(commission.earned || 0).toLocaleString()}
                </p>
              </div>

              <div className={styles.commissionItem}>
                <div className={styles.commissionLabel}>
                  <span>Approved</span>
                  <span className={styles.commissionCount}>
                    ({commission.approved})
                  </span>
                </div>
                <p className={styles.commissionAmount}>
                  ₹{(commission.approved || 0).toLocaleString()}
                </p>
              </div>

              <div className={styles.commissionItem}>
                <div className={styles.commissionLabel}>
                  <span>Paid</span>
                  <span className={styles.commissionCount}>
                    ({commission.paid})
                  </span>
                </div>
                <p className={styles.commissionAmount}>
                  ₹{(commission.paid || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Orders Summary */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Orders This Month</h2>
              <Link href="/distributor/orders" className={styles.viewLink}>
                View All
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.ordersSummary}>
              <div className={styles.orderStat}>
                <span className={styles.statLabel}>Total Orders</span>
                <span className={styles.statValue}>{orders.total}</span>
              </div>
              <div className={styles.orderStat}>
                <span className={styles.statLabel}>Completed</span>
                <span className={`${styles.statValue} ${styles.success}`}>
                  {orders.completed}
                </span>
              </div>
              <div className={styles.orderStat}>
                <span className={styles.statLabel}>Pending</span>
                <span className={`${styles.statValue} ${styles.warning}`}>
                  {orders.pending}
                </span>
              </div>
              <div className={styles.orderStat}>
                <span className={styles.statLabel}>Failed</span>
                <span className={`${styles.statValue} ${styles.danger}`}>
                  {orders.failed}
                </span>
              </div>
            </div>

            <div className={styles.orderTotal}>
              <span>Total Spent:</span>
              <strong>₹{(orders.totalSpent || 0).toLocaleString()}</strong>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Quick Actions</h2>

            <div className={styles.actionsList}>
              <Link href="/distributor/marketplace" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <ShoppingCart size={20} />
                </div>
                <div className={styles.actionContent}>
                  <p className={styles.actionTitle}>Buy Plans</p>
                  <p className={styles.actionDesc}>Purchase more plans</p>
                </div>
                <ArrowRight size={16} />
              </Link>

              <Link href="/distributor/retailers" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <Users size={20} />
                </div>
                <div className={styles.actionContent}>
                  <p className={styles.actionTitle}>Manage Retailers</p>
                  <p className={styles.actionDesc}>View & assign plans</p>
                </div>
                <ArrowRight size={16} />
              </Link>

              <Link href="/distributor/commissions" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <DollarSign size={20} />
                </div>
                <div className={styles.actionContent}>
                  <p className={styles.actionTitle}>View Commissions</p>
                  <p className={styles.actionDesc}>Track earnings & payouts</p>
                </div>
                <ArrowRight size={16} />
              </Link>

              <Link href="/distributor/transactions" className={styles.actionItem}>
                <div className={styles.actionIcon}>
                  <TrendingUp size={20} />
                </div>
                <div className={styles.actionContent}>
                  <p className={styles.actionTitle}>Transactions</p>
                  <p className={styles.actionDesc}>View financial ledger</p>
                </div>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
