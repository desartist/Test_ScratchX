'use client';

import React, { useState } from 'react';
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
  Wallet,
  Clock,
} from 'lucide-react';
import { useDistributorDashboardQuery } from '@/hooks/queries/useDistributorDashboardQuery';
import { useDistributorDashboardChartsQuery } from '@/hooks/queries/useDistributorDashboardChartsQuery';
import { getAccountInitials } from '@/lib/accountDisplay';
import LoadingState from '@/components/common/LoadingState';
import AddBusinessModal from '@/components/distributor/AddBusinessModal';
import StatCard from '@/components/dashboard/shared/StatCard';
import { MultiLineChart, DonutChart, HBarList } from '@/components/dashboard/smart/charts';
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
  const { data: chartsData } = useDistributorDashboardChartsQuery(30);
  const error = queryError ? queryError.message : null;
  const [showAddBusinessModal, setShowAddBusinessModal] = useState(false);

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

  const commissionTrend = chartsData?.commissionTrend || [];
  const topRetailers = (chartsData?.topRetailers || []).map((r) => ({ label: r.name, value: r.earned }));
  const businessTypeSegments = [
    { label: 'Retailers', value: metrics.retailBusinesses, color: '#6d5df6' },
    { label: 'Wholesalers', value: metrics.wholesaleBusinesses, color: '#ef9e1b' },
  ];
  const totalBusinesses = metrics.retailBusinesses + metrics.wholesaleBusinesses;

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
          <h2 className={styles.heroTitle}>Add New Business</h2>
          <p className={styles.heroSubtitle}>
            Onboard a new retailer or wholesaler with 365 days of unlimited access.
          </p>

          <div className={styles.heroStats}>
            <div className={styles.heroStatMain}>
              <span className={styles.heroStatValue}>{metrics.retailBusinesses + metrics.wholesaleBusinesses}</span>
              <span className={styles.heroStatLabel}>Total Businesses</span>
            </div>

            <div className={styles.heroSubstats}>
              <div className={styles.heroStatSub}>
                <span className={styles.heroStatSubValue}>{metrics.retailBusinesses}</span>
                <span className={styles.heroStatSubLabel}>Retailers</span>
              </div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStatSub}>
                <span className={styles.heroStatSubValue}>{metrics.wholesaleBusinesses}</span>
                <span className={styles.heroStatSubLabel}>Wholesalers</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.heroButton}
            onClick={() => setShowAddBusinessModal(true)}
          >
            Start Onboarding
            <ArrowRight size={16} />
          </button>
        </div>

  {/* Territory Overview */}
        <div className={styles.sectionHeading}>
          <h2>Territory Overview</h2>
        </div>

        <div className={styles.statGrid}>
          <StatCard
            icon={<Users />}
            value={totalRemaining}
            label="Licenses Remaining"
          />
          <StatCard
            icon={<CreditCard />}
            value={metrics.licensesPurchased}
            label="Core + Smart Licenses Purchased"
            subtitle={`${inventory.core.totalPurchased} Core + ${inventory.smart.totalPurchased} Smart`}
          />
          <StatCard
            icon={<Wallet />}
            value={`₹${metrics.monthlyMargin.toLocaleString('en-IN')}`}
            label="Estimated Margin"
            subtitle="This month"
          />
          <StatCard
            icon={<Clock />}
            value={`₹${metrics.pendingPayoutAmount.toLocaleString('en-IN')}`}
            label="Pending Payments"
            tone="red"
            subtitle={
              metrics.pendingRetailerCount > 0
                ? `From ${metrics.pendingRetailerCount} retailer${metrics.pendingRetailerCount === 1 ? '' : 's'}`
                : 'No pending payments'
            }
          />
        </div>

        {/* Charts: Commission Trend + Business Mix */}
        <div className={styles.chartsGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Commission Earned</h2>
              <span className={styles.chartRangeNote}>Last 30 Days</span>
            </div>
            <MultiLineChart
              labels={commissionTrend.map((d) => d.label)}
              series={[{ name: 'Commission', color: '#6d5df6', data: commissionTrend.map((d) => d.earned) }]}
              ariaLabel="Daily commission earned over the last 30 days"
            />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Business Mix</h2>
            {totalBusinesses === 0 ? (
              <p className={styles.emptyText}>No businesses onboarded yet.</p>
            ) : (
              <DonutChart
                segments={businessTypeSegments}
                centerLabel={totalBusinesses}
                centerSubLabel="Total"
                ariaLabel="Retailers vs wholesalers breakdown"
              />
            )}
          </div>
        </div>

        {/* Top Retailers by Commission */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Top Retailers by Commission</h2>
          {topRetailers.length === 0 ? (
            <p className={styles.emptyText}>No commission earned yet.</p>
          ) : (
            <HBarList
              items={topRetailers}
              valueFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
              ariaLabel="Top retailers by commission earned"
            />
          )}
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

      <AddBusinessModal
        isOpen={showAddBusinessModal}
        onClose={() => setShowAddBusinessModal(false)}
      />
    </div>
  );
}
