'use client';

import React, { useMemo, useState } from 'react';
import { Search, Users, CalendarCheck, Gift, AlertCircle } from 'lucide-react';
import { useCustomersQuery } from '@/hooks/queries/useCustomersQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import CustomerDetailDrawer from '@/components/customers/CustomerDetailDrawer';
import WhatsAppButton from '@/components/whatsapp/WhatsAppButton';
import { useSubscription } from '@/components/subscription/SubscriptionContext';
import SkeletonTableRows from '@/components/ui/SkeletonTableRows';
import styles from './customers.module.css';
import { SkeletonCardList } from "@/components/ui/SkeletonCard";

// Matches the seed data's canUseWhatsAppIntegration flag (Smart-only feature)
const WHATSAPP_ENABLED_PLAN_TYPES = ['SMART'];

const DEFAULT_STATS = {
  totalCustomers: 0,
  todaysCustomers: 0,
  rewardsAwarded: 0,
  rewardsClaimed: 0,
  activeParticipants: 0,
};

const PAGE_SIZE = 20;

// Status filter tabs — same pattern as the Super Admin customers page. Only
// the statuses the live scan flow actually produces get a tab; anything else
// still shows under "All".
const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'revealed', label: 'Revealed' },
  { value: 'redeemed', label: 'Claimed' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_LABELS = {
  initiated: 'Initiated',
  verified: 'Verified',
  scratched: 'Scratched',
  revealed: 'Revealed',
  redeemed: 'Claimed',
  expired: 'Expired',
  failed: 'Failed',
};

// 8 columns: Customer, Campaign, Store, Staff, Reward, Status, Date, action.
const COLUMN_COUNT = 8;

function formatWonReward(card) {
  if (!card) return null;
  const { reward_type, reward_value } = card;
  if (reward_type === 'discount' || reward_type === 'voucher') return `₹${reward_value} OFF`;
  if (reward_type === 'cashback') return `${reward_value}% OFF`;
  if (reward_type === 'freeItem') return card.reward_description || 'Free Gift';
  return reward_value ? `₹${reward_value} OFF` : null;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CustomersPage() {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Each unique filter/pagination combo gets its own cache entry
  // automatically — no more manual "cache page 1 only" special-casing.
  const params = useMemo(
    () => ({
      page: currentPage,
      limit: PAGE_SIZE,
      search: searchQuery,
      campaign: selectedCampaign,
      store: selectedStore,
      status: selectedStatus,
      dateRange,
      sortBy,
    }),
    [currentPage, searchQuery, selectedCampaign, selectedStore, selectedStatus, dateRange, sortBy],
  );

  const { data, isPending: loading, error: queryError } = useCustomersQuery(params);
  const customers = data?.data || [];
  const stats = data?.stats || DEFAULT_STATS;
  const campaigns = data?.filters?.campaigns || [];
  const stores = data?.filters?.stores || [];
  const totalMatching = data?.pagination?.total ?? customers.length;
  // The page used to request 20 at a time with no way to reach page 2, so
  // only the newest 20 customers were ever visible.
  const totalPages = Math.max(1, data?.pagination?.pages || 1);
  const error = queryError ? queryError.message : null;

  const { planData } = useSubscription();
  const whatsappEnabled = WHATSAPP_ENABLED_PLAN_TYPES.includes(planData?.planType);

  // Any filter change goes back to page 1.
  const withReset = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const openCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDrawer(true);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>Manage and track customer participation across campaigns</p>
        </div>
      </div>

      {/* Stats — the shared StatCard used across the dashboards */}
      <div className={styles.statGrid}>
        <StatCard
          icon={<Users />}
          value={(stats.totalCustomers || 0).toLocaleString('en-IN')}
          label="Total Customers"
          loading={loading}
        />
        <StatCard
          icon={<CalendarCheck />}
          value={(stats.todaysCustomers || 0).toLocaleString('en-IN')}
          label="Today's Customers"
          tone="green"
          loading={loading}
        />
        <StatCard
          icon={<Gift />}
          value={(stats.rewardsAwarded || 0).toLocaleString('en-IN')}
          label="Rewards Awarded"
          loading={loading}
        />
        {/* TODO: Rewards Claimed & Active Participants — enable when cashier integration is live */}
      </div>

      {/* Filters */}
      <div className={styles.filterPanel}>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, mobile, or campaign..."
            value={searchQuery}
            onChange={(e) => withReset(setSearchQuery)(e.target.value)}
            className={styles.searchInput}
            aria-label="Search customers"
          />
        </div>

        <div className={styles.filterTabs} role="tablist" aria-label="Filter by status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selectedStatus === tab.value}
              className={`${styles.filterTab} ${selectedStatus === tab.value ? styles.active : ''}`}
              onClick={() => withReset(setSelectedStatus)(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.filterGrid}>
          <select
            value={selectedCampaign}
            onChange={(e) => withReset(setSelectedCampaign)(e.target.value)}
            className={styles.select}
            aria-label="Campaign"
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c._id} value={c._id}>
                {c.campaignName || c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStore}
            onChange={(e) => withReset(setSelectedStore)(e.target.value)}
            className={styles.select}
            aria-label="Store"
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.store_name}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => withReset(setDateRange)(e.target.value)}
            className={styles.select}
            aria-label="Date range"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => withReset(setSortBy)(e.target.value)}
            className={styles.select}
            aria-label="Sort by"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </div>
      </div>

      {/* Customers table */}
      {error ? (
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{error}</p>
        </div>
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Campaign</th>
                  <th>Store</th>
                  <th>Staff</th>
                  <th>Reward</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className={styles.actionsCol}>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows rows={6} cols={COLUMN_COUNT} />
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className={styles.emptyState}>
                      <Users size={32} />
                      <p>No customers found</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const won = formatWonReward(customer.scratch_card_id);
                    const status = customer.status;
                    return (
                      <tr
                        key={customer._id}
                        className={styles.row}
                        onClick={() => openCustomer(customer)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openCustomer(customer);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`View ${customer.customer_name}`}
                      >
                        <td>
                          <div className={styles.customerName}>
                            {customer.customer_name}
                            {customer.is_repeat_customer && (
                              <span className={styles.repeatBadge}>Repeat</span>
                            )}
                          </div>
                          <div className={styles.muted}>{customer.customer_mobile}</div>
                        </td>
                        <td>
                          {customer.campaign_id?.campaignName || customer.campaign_id?.name || '—'}
                        </td>
                        <td>
                          <div>{customer.store_id?.store_name || customer.matched_store_name || '—'}</div>
                          {customer.store_id?.city && (
                            <div className={styles.muted}>{customer.store_id.city}</div>
                          )}
                        </td>
                        <td>
                          {customer.handled_by_staff_id?.name || (
                            <span className={styles.muted}>General QR</span>
                          )}
                        </td>
                        <td>
                          {won ? (
                            <span className={styles.reward}>{won}</span>
                          ) : (
                            <span className={styles.muted}>
                              ₹{customer.range_id?.minAmount || 0} – ₹{customer.range_id?.maxAmount || 0}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles[`badge-${status}`] || ''}`}>
                            {STATUS_LABELS[status] || status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.nowrap}>{formatDate(customer.createdAt)}</div>
                          <div className={styles.muted}>{formatTime(customer.createdAt)}</div>
                        </td>
                        <td
                          className={styles.actionsCol}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <WhatsAppButton
                            phoneNumber={customer.customer_mobile}
                            countryCode="+91"
                            defaultMessage={`Hi ${customer.customer_name}, thank you for visiting ${customer.matched_store_name}. ${
                              won ? `You've won ${won}!` : ''
                            }`}
                            recipientType="customer"
                            defaultImage={
                              customer.scratch_card_id?.reward_type === 'freeItem'
                                ? customer.scratch_card_id.reward_image || null
                                : null
                            }
                            customerId={customer._id}
                            campaignId={customer.campaign_id?._id}
                            placeholderValues={{
                              customerName: customer.customer_name,
                              reward: won || '',
                            }}
                            disabled={!whatsappEnabled}
                            disabledReason={
                              !whatsappEnabled
                                ? 'Upgrade to the Smart plan to unlock WhatsApp sharing'
                                : 'No phone number on file'
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && customers.length > 0 && (
            <div className={styles.pagination}>
              <span className={styles.pageSummary}>
                {totalMatching.toLocaleString('en-IN')} customer{totalMatching === 1 ? '' : 's'}
              </span>
              {totalPages > 1 && (
                <div className={styles.pageControls}>
                  <button
                    type="button"
                    className={styles.pageButton}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className={styles.pageLabel}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageButton}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      <CustomerDetailDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        customer={selectedCustomer}
      />
    </div>
  );
}
