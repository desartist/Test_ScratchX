'use client';

import React from 'react';
import Link from 'next/link';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Users,
  CreditCard,
  AlertCircle,
  Package,
  Zap,
  ShoppingCart,
  MapPin,
} from 'lucide-react';
import { useDistributorDashboardQuery } from '@/hooks/queries/useDistributorDashboardQuery';
import { getAccountInitials } from '@/lib/accountDisplay';
import LoadingState from '@/components/common/LoadingState';
import styles from './distributor.module.css';

function formatDaysLeft(daysLeft) {
  if (daysLeft <= 0) {
    const daysAgo = Math.abs(daysLeft);
    return daysAgo === 0 ? 'Plan lapsed today' : `Plan lapsed ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
  }
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
}

export default function DistributorDashboard() {
  const { data: dashboard, isPending: loading, error: queryError, refetch } = useDistributorDashboardQuery();
  const error = queryError ? queryError.message : null;

  if (loading) {
    return (
      <div className={styles.page}>
        <LoadingState message="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertCircle size={48} />
          <p>{error}</p>
          <button onClick={() => refetch()} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const { distributor, metrics, inventory, rechargeQueue } = dashboard;
  const totalRemaining = inventory.core.totalRemaining + inventory.smart.totalRemaining;
  const location = [distributor.territory, distributor.region].filter(Boolean).join(', ');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Profile header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>{getAccountInitials({ name: distributor.name })}</div>
          <div>
            <h1 className={styles.profileName}>{distributor.name}</h1>
            {location && (
              <p className={styles.profileLocation}>
                <MapPin size={14} />
                {location}
              </p>
            )}
          </div>
        </div>

        {/* Hero: Add Retailer */}
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            {/* <div className={styles.heroIcon}>
              <Plus size={20} />
            </div> */}
            {metrics.retailerGrowthPercent !== null && metrics.retailerGrowthPercent !== 0 && (
              <span className={styles.heroTrend}>
                {metrics.retailerGrowthPercent > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {metrics.retailerGrowthPercent > 0 ? '+' : ''}
                {metrics.retailerGrowthPercent}% this week
              </span>
            )}
          </div>
          <h2 className={styles.heroTitle}>Add Retailer</h2>
          <p className={styles.heroSubtitle}>
            Onboard a new store with 365 days of unlimited access.
          </p>

          <div className={styles.heroStats}>
            <div className={styles.heroStatMain}>
              <span className={styles.heroStatValue}>{totalRemaining}</span>
              <span className={styles.heroStatLabel}>Plan licenses remaining</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStatSub}>
              <span className={styles.heroStatSubValue}>{inventory.smart.totalRemaining}</span>
              <span className={styles.heroStatSubLabel}>Smart</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStatSub}>
              <span className={styles.heroStatSubValue}>{inventory.core.totalRemaining}</span>
              <span className={styles.heroStatSubLabel}>Core</span>
            </div>
          </div>

          <Link href="/retailers" className={styles.heroButton}>
            Start Onboarding
            <ArrowRight size={16} />
          </Link>
        </div>

  {/* Territory Overview */}
        <div className={styles.sectionHeading}>
          <h2>Territory Overview</h2>
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statTopRow}>
              <div className={`${styles.statIcon} ${styles['icon-purple']}`}>
                <Users size={19} />
              </div>
              <div className={styles.statNumberCol}>
                <span className={styles.statValue}>{metrics.retailersThisWeek}</span>
                {metrics.retailerGrowthPercent !== null && metrics.retailerGrowthPercent !== 0 && (
                  <span className={styles.statTrend}>
                    {metrics.retailerGrowthPercent > 0 ? '+' : ''}
                    {metrics.retailerGrowthPercent}% this week
                  </span>
                )}
              </div>
            </div>
            <p className={styles.statLabel}>New Retailers This Week</p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statTopRow}>
              <div className={`${styles.statIcon} ${styles['icon-blue']}`}>
                <CreditCard size={19} />
              </div>
              <div className={styles.statNumberCol}>
                <span className={styles.statValue}>{metrics.licensesPurchased}</span>
                <span className={styles.statTrend}>
                  {inventory.core.totalPurchased} Core + {inventory.smart.totalPurchased} Smart
                </span>
              </div>
            </div>
            <p className={styles.statLabel}>Core + Smart Licenses Purchased</p>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statValueSolo}>₹{metrics.monthlyMargin.toLocaleString('en-IN')}</span>
            <p className={styles.statLabelBold}>Estimated Margin</p>
            <p className={styles.statCaption}>This month</p>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statValueSolo}>₹{metrics.pendingPayoutAmount.toLocaleString('en-IN')}</span>
            <p className={styles.statLabelBold}>Pending Payments</p>
            <p className={styles.statCaption}>
              {metrics.pendingRetailerCount > 0
                ? `From ${metrics.pendingRetailerCount} retailer${metrics.pendingRetailerCount === 1 ? '' : 's'}`
                : 'No pending payments'}
            </p>
          </div>
        </div>
        {/* Recharge Queue */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recharge Queue</h2>
            <Link href="/retailers" className={styles.viewLink}>
              View All
              <ArrowRight size={16} />
            </Link>
          </div>

          {rechargeQueue.length === 0 ? (
            <p className={styles.emptyText}>No retailers need a recharge right now.</p>
          ) : (
            <div className={styles.queueList}>
              {rechargeQueue.map((item) => (
                <div key={item.retailerId} className={styles.queueItem}>
                  <div className={styles.queueAvatar}>{getAccountInitials({ name: item.storeName })}</div>
                  <div className={styles.queueInfo}>
                    <p className={styles.queueName}>{item.storeName}</p>
                    <p className={styles.queueMeta}>
                      {item.location ? `${item.location} · ` : ''}
                      {item.planType === 'CORE' ? 'Core Plan' : 'Smart Plan'}
                    </p>
                    <p className={item.daysLeft <= 0 ? styles.queueLapsed : styles.queueDaysLeft}>
                      {formatDaysLeft(item.daysLeft)}
                    </p>
                  </div>
                  <Link href="/retailers" className={styles.rechargeBtn}>
                    Recharge
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Restock Inventory */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Restock Inventory</h2>
          </div>

          <div className={styles.restockList}>
            <div className={styles.restockItem}>
              <div className={`${styles.restockIcon} ${styles['icon-purple']}`}>
                <Zap size={18} />
              </div>
              <div className={styles.restockInfo}>
                <p className={styles.restockName}>Smart License</p>
                <p className={styles.restockMeta}>
                  ₹{inventory.smart.unitMRP.toLocaleString('en-IN')}/license · {inventory.smart.totalRemaining} left
                </p>
              </div>
              <Link href="/marketplace" className={styles.buyBtnPrimary}>
                Buy Smart
              </Link>
            </div>

            <div className={styles.restockItem}>
              <div className={`${styles.restockIcon} ${styles['icon-blue']}`}>
                <Package size={18} />
              </div>
              <div className={styles.restockInfo}>
                <p className={styles.restockName}>Core License</p>
                <p className={styles.restockMeta}>
                  ₹{inventory.core.unitMRP.toLocaleString('en-IN')}/license · {inventory.core.totalRemaining} left
                </p>
              </div>
              <Link href="/marketplace" className={styles.buyBtnSecondary}>
                Buy Core
              </Link>
            </div>

            <div className={styles.restockItem}>
              <div className={`${styles.restockIcon} ${styles['icon-orange']}`}>
                <ShoppingCart size={18} />
              </div>
              <div className={styles.restockInfo}>
                <p className={styles.restockName}>Recharge Plans</p>
                <p className={styles.restockMeta}>Available · {totalRemaining} total</p>
              </div>
              <Link href="/marketplace" className={styles.buyBtnSecondary}>
                Buy Plans
              </Link>
            </div>
          </div>
        </div>

      
      </div>
    </div>
  );
}
