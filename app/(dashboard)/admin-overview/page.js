'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  AlertCircle,
  Plus,
  Shield,
  BarChart3,
  Zap,
  X,
  Eye,
  EyeOff,
  Store as StoreIcon,
  Megaphone,
  Wallet,
  Ticket,
  Gift,
  AlertTriangle,
  Clock,
  FileText,
  UsersRound,
  ClipboardList,
  Building2,
  Repeat,
} from 'lucide-react';
import { useSuperAdminDashboardQuery } from '@/hooks/queries/useSuperAdminDashboardQuery';
import { useCreateDistributorMutation } from '@/hooks/queries/useAdminDistributorsQuery';
import { useAdminAnalyticsQuery } from '@/hooks/queries/useAdminAnalyticsQuery';
import { useAdminCampaignsQuery } from '@/hooks/queries/useAdminCampaignsQuery';
import { useAdminActivityTrendQuery } from '@/hooks/queries/useAdminActivityTrendQuery';
import { useAdminDashboardChartsQuery } from '@/hooks/queries/useAdminDashboardChartsQuery';
import { useAdminCustomersQuery } from '@/hooks/queries/useAdminCustomersQuery';
import { useDistributorMerchantsQuery } from '@/hooks/queries/useDistributorMerchantsQuery';
import { MultiLineChart, DonutChart, HBarList } from '@/components/dashboard/smart/charts';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin.module.css';

const CAMPAIGN_CONSUMPTION_COLORS = ['#6d5df6', '#ef9e1b', '#00b0b1', '#4c6ef5', '#b9b0f7'];

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CAMPAIGN_STATUS_LABEL = { draft: 'Draft', active: 'Active', paused: 'Paused', ended: 'Ended' };

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  companyName: '',
  territory: '',
  region: '',
  commissionRate: '',
};

export default function AdminOverviewPage() {
  const { data, isPending: loading, error: queryError, refetch } = useSuperAdminDashboardQuery();
  const error = queryError ? queryError.message || 'Failed to load admin dashboard' : null;
  const { data: analytics } = useAdminAnalyticsQuery(30);
  const { data: topCampaignsData } = useAdminCampaignsQuery({ limit: 3, status: 'active' });
  const { data: activityData } = useAdminActivityTrendQuery(30);
  const { data: chartsData } = useAdminDashboardChartsQuery(30);
  const { data: customersMeta } = useAdminCustomersQuery({ limit: 1 });
  const { data: merchantsMeta } = useDistributorMerchantsQuery({ limit: 1 });

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const createMutation = useCreateDistributorMutation();

  const metrics = {
    totalDistributors: data?.roleCounts?.distributors || 0,
    totalMerchants: data?.roleCounts?.merchants || 0,
  };
  const platform = data?.platform || {
    totalStores: 0,
    activeStores: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalCustomers: 0,
    totalRedemptions: 0,
    scratchAllocated: 0,
    scratchUsed: 0,
    scratchRemaining: 0,
  };
  const health = data?.health || { expiringSubscriptions30d: 0 };
  const revenue30d = analytics?.revenue?.total || 0;
  const pendingInvoices = analytics?.invoices?.outstanding || 0;
  const recentUsers = data?.recentUsers || [];

  const topCampaigns = topCampaignsData?.campaigns || [];
  const trend = activityData?.trend || [];
  const campaignStatus = activityData?.campaignStatus || { draft: 0, active: 0, paused: 0, ended: 0 };
  const totalCampaignsForStatus = Object.values(campaignStatus).reduce((sum, v) => sum + v, 0);

  const scratchUsage = (chartsData?.scratchUsage || []).map((d) => ({
    label: d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '',
    value: d.used,
  }));
  const campaignConsumption = (chartsData?.campaignConsumption || []).map((c, i) => ({
    label: c.name,
    value: c.used,
    color: CAMPAIGN_CONSUMPTION_COLORS[i % CAMPAIGN_CONSUMPTION_COLORS.length],
  }));
  const consumptionTotal = campaignConsumption.reduce((sum, c) => sum + c.value, 0);
  const storeWiseItems = (chartsData?.storeWise || []).map((s) => ({ label: s.name, value: s.used }));
  const storeWiseTotal = storeWiseItems.reduce((sum, s) => sum + s.value, 0);

  const wholesalerCount = merchantsMeta?.metrics?.wholesale || 0;
  const totalCustomersForRetention = customersMeta?.metrics?.totalCustomers || 0;
  const returningCustomers = customersMeta?.metrics?.returningCustomers || 0;
  const retentionRate = totalCustomersForRetention > 0
    ? Math.round((returningCustomers / totalCustomersForRetention) * 100)
    : 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowPassword(false);
  };

  const handleCreateDistributor = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Name, email and password are required');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    if (formData.commissionRate !== '') {
      const rate = Number(formData.commissionRate);
      if (Number.isNaN(rate) || rate < 0 || rate > 100) {
        setFormError('Commission rate must be a number between 0 and 100');
        return;
      }
    }

    try {
      await createMutation.mutateAsync(formData);
      handleCloseModal();
    } catch (err) {
      setFormError(err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <LoadingState message="Loading admin dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
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
            <h1>Admin Dashboard</h1>
            <p>System overview and management</p>
          </div>
          <button className={styles.primaryButton} onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Add Distributor
          </button>
        </div>

        {/* Section 1: Platform Overview */}
        <h2 className={styles.sectionTitle}>Platform Overview</h2>
        <div className={styles.statGrid}>
          <StatCard
            href="/retailers"
            icon={<UsersRound />}
            value={metrics.totalMerchants}
            label="Retailers"
          />
          <StatCard
            href="/distributors"
            icon={<Users />}
            value={metrics.totalDistributors}
            label="Distributors"
          />
          <StatCard
            href="/campaign-intelligence"
            icon={<Megaphone />}
            value={`${platform.activeCampaigns} / ${platform.totalCampaigns}`}
            label="Live Campaigns"
          />
          <StatCard
            href="/revenue"
            icon={<Wallet />}
            value={formatCurrency(revenue30d)}
            label="Revenue (30d)"
          />
        </div>

        {/* Section 2: Engagement */}
        <h2 className={styles.subsectionTitle}>Engagement</h2>
        <div className={styles.statGrid}>
          <StatCard
            href="/admin-customers"
            icon={<Users />}
            value={platform.totalCustomers.toLocaleString('en-IN')}
            label="Customers"
          />
          <StatCard
            href="/scratch-economy"
            icon={<Ticket />}
            value={`${platform.scratchUsed.toLocaleString('en-IN')} / ${platform.scratchAllocated.toLocaleString('en-IN')}`}
            label="Scratches Used"
          />
          <StatCard
            href="/admin-redemptions"
            icon={<Gift />}
            value={platform.totalRedemptions.toLocaleString('en-IN')}
            label="Redemptions"
          />
          <StatCard
            href="/admin-stores"
            icon={<StoreIcon />}
            value={`${platform.activeStores} / ${platform.totalStores}`}
            label="Active Stores"
          />
          <StatCard
            href="/retailers"
            icon={<Building2 />}
            value={wholesalerCount}
            label="Wholesalers"
          />
          <StatCard
            href="/admin-customers"
            icon={<Repeat />}
            value={`${retentionRate}%`}
            label="Customer Retention"
            subtitle={`${returningCustomers.toLocaleString('en-IN')} of ${totalCustomersForRetention.toLocaleString('en-IN')} return`}
          />
        </div>

        {/* Section 3: Platform Health */}
        <h2 className={styles.subsectionTitle}>Platform Health</h2>
        <div className={styles.statGrid}>
          <StatCard
            href="/subscriptions"
            tone="red"
            icon={<Clock />}
            value={health.expiringSubscriptions30d}
            label="Expiring Subscriptions (30d)"
          />
          <StatCard
            href="/scratch-economy"
            tone="red"
            icon={<AlertTriangle />}
            value="View report"
            label="Low Scratch Balances"
          />
          <StatCard
            href="/revenue"
            tone="red"
            icon={<FileText />}
            value={pendingInvoices}
            label="Outstanding Invoices"
          />
        </div>

        {/* Quick Actions */}
        <h2 className={styles.subsectionTitle}>Quick Actions</h2>
        <div className={styles.statGrid}>
          <StatCard
            href="/admin-stores"
            icon={<StoreIcon />}
            value={String(platform.activeStores).padStart(2, '0')}
            label="Stores"
            subtitle={`${platform.activeStores} active out of ${platform.totalStores}`}
          />
          <StatCard
            href="/campaign-intelligence"
            icon={<Megaphone />}
            value={String(platform.totalCampaigns).padStart(2, '0')}
            label="Campaigns"
            subtitle={`${platform.activeCampaigns} campaign${platform.activeCampaigns === 1 ? '' : 's'} live now`}
          />
          <StatCard
            href="/admin-support"
            icon={<ClipboardList />}
            value=""
            label="Support Tickets"
            subtitle="Review open support & escalations"
          />
          <StatCard
            href="/admin-team"
            icon={<Users />}
            value=""
            label="Team & Roles"
            subtitle="Manage internal admin staff access"
          />
        </div>

        {/* Top Campaigns */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Campaigns</h2>
            <Link href="/campaign-intelligence" className={styles.viewAllLink}>View all</Link>
          </div>

          {topCampaigns.length === 0 ? (
            <p className={styles.emptyNote}>No active campaigns right now.</p>
          ) : (
            <div className={styles.topCampaignsList}>
              {topCampaigns.map((c) => {
                const allocationPct = c.allocated > 0 ? Math.min(100, Math.round((c.used / c.allocated) * 100)) : 0;
                const remaining = Math.max(0, c.allocated - c.used);
                return (
                  <div key={c._id} className={styles.topCampaignCard}>
                    <div className={styles.topCampaignHeader}>
                      <div>
                        <h3 className={styles.topCampaignName}>{c.name}</h3>
                        <p className={styles.topCampaignMeta}>{c.merchantName} &middot; {formatDate(c.startDate)} - {formatDate(c.endDate)}</p>
                      </div>
                      <span className={`${styles.statusBadge} ${styles[`status-${c.status}`]}`}>{CAMPAIGN_STATUS_LABEL[c.status] || c.status}</span>
                    </div>

                    <div className={styles.topCampaignStats}>
                      <span><StoreIcon size={14} /> {c.storeCount} Store{c.storeCount === 1 ? '' : 's'}</span>
                      <span><Gift size={14} /> {c.redemptionCount} Redemptions</span>
                    </div>

                    <div className={styles.allocationBlock}>
                      <div className={styles.allocationLabelRow}>
                        <span>Scratch Allocation</span>
                        <span>{c.used.toLocaleString('en-IN')} / {c.allocated.toLocaleString('en-IN')}</span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${allocationPct}%` }} />
                      </div>
                      <span className={styles.allocationRemaining}>{remaining.toLocaleString('en-IN')} left</span>
                    </div>

                    <Link href="/campaign-intelligence" className={styles.topCampaignViewBtn}>View</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Charts: Activity Overview + Campaign Status */}
        <div className={styles.chartsGrid}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Activity Overview</h2>
              <span className={styles.chartRangeNote}>Last 30 Days</span>
            </div>
            <MultiLineChart
              labels={trend.map((t) => t.label)}
              series={[
                { name: 'Scans', color: '#ef9e1b', data: trend.map((t) => t.scans) },
                { name: 'Participations', color: '#010f44', data: trend.map((t) => t.participations) },
                { name: 'Redemptions', color: '#00b0b1', data: trend.map((t) => t.redemptions) },
              ]}
              ariaLabel="Platform activity over the last 30 days"
            />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Campaign Status</h2>
            <DonutChart
              segments={[
                { label: 'Active', value: campaignStatus.active, color: '#ef9e1b' },
                { label: 'Draft', value: campaignStatus.draft, color: '#010f44' },
                { label: 'Paused', value: campaignStatus.paused, color: '#00b0b1' },
                { label: 'Ended', value: campaignStatus.ended, color: '#9ca3af' },
              ]}
              centerLabel={totalCampaignsForStatus}
              centerSubLabel="Total"
              ariaLabel="Campaign status breakdown"
            />
          </div>
        </div>

        {/* Charts: Scratch Consumption + Campaign-wise Consumption */}
        <div className={styles.chartsGrid}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Scratch Consumption</h2>
              <span className={styles.chartRangeNote}>Last 30 Days</span>
            </div>
            <MultiLineChart
              labels={scratchUsage.map((d) => d.label)}
              series={[{ name: 'Scratches Used', color: '#6d5df6', data: scratchUsage.map((d) => d.value) }]}
              ariaLabel="Daily scratch usage over the last 30 days"
            />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Campaign-wise Consumption</h2>
            {campaignConsumption.length === 0 ? (
              <p className={styles.emptyNote}>No scratch usage recorded yet.</p>
            ) : (
              <DonutChart
                segments={campaignConsumption}
                centerLabel={consumptionTotal.toLocaleString('en-IN')}
                centerSubLabel="Used"
                ariaLabel="Top campaigns by scratch consumption"
              />
            )}
          </div>
        </div>

        {/* Store-wise Performance */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Store-wise Performance</h2>
          {storeWiseItems.length === 0 ? (
            <p className={styles.emptyNote}>No store-level scratch usage recorded yet.</p>
          ) : (
            <>
              <div className={styles.statRow}>
                <div className={styles.statRowItem}>
                  <span className={styles.statRowValue}>{storeWiseTotal.toLocaleString('en-IN')}</span>
                  <span className={styles.statRowLabel}>Total Scratches Used</span>
                </div>
                <div className={styles.statRowItem}>
                  <span className={styles.statRowValue}>{storeWiseItems.length}</span>
                  <span className={styles.statRowLabel}>Top Stores Shown</span>
                </div>
              </div>
              <HBarList items={storeWiseItems} ariaLabel="Top stores by scratch usage" />
            </>
          )}
        </div>

        {/* Recent Signups */}
        {recentUsers.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Merchant Signups</h2>
            </div>

            <div className={styles.activitiesList}>
              {recentUsers.map((user) => (
                <div key={user._id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    <Users size={18} />
                  </div>

                  <div className={styles.activityContent}>
                    <p className={styles.activityDescription}>
                      {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                    </p>
                    <p className={styles.activityTime}>
                      {new Date(user.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' • '}
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
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

      {/* Add Distributor Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add Distributor</h2>
              <button className={styles.modalClose} onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateDistributor} className={styles.modalForm}>
              {formError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.formLabel}>
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.formLabel}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    className={styles.formInput}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone" className={styles.formLabel}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.formLabel}>
                  Password *
                </label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password (min 6 characters)"
                    className={styles.formInput}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="companyName" className={styles.formLabel}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="territory" className={styles.formLabel}>
                    Territory
                  </label>
                  <input
                    type="text"
                    id="territory"
                    name="territory"
                    value={formData.territory}
                    onChange={handleInputChange}
                    placeholder="e.g. North India"
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="region" className={styles.formLabel}>
                    Region
                  </label>
                  <input
                    type="text"
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="e.g. Delhi NCR"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="commissionRate" className={styles.formLabel}>
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    id="commissionRate"
                    name="commissionRate"
                    value={formData.commissionRate}
                    onChange={handleInputChange}
                    placeholder="Default: 0%"
                    min="0"
                    max="100"
                    step="0.1"
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Distributor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
