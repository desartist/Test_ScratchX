'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { criticalFetchService } from '@/lib/criticalFetchService';
import CustomerStatsCard from '@/components/customers/CustomerStatsCard';
import CustomerDetailDrawer from '@/components/customers/CustomerDetailDrawer';
import styles from './customers.module.css';

export default function CustomersPage() {
  const { account } = useAuthContext();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Data for filters
  const [campaigns, setCampaigns] = useState([]);
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todaysCustomers: 0,
    rewardsAwarded: 0,
    rewardsClaimed: 0,
    activeParticipants: 0,
  });

  // Fetch customers with cache for first page, bypass for subsequent pages
  const fetchCustomers = useCallback(async () => {
    if (!account?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        campaign: selectedCampaign,
        store: selectedStore,
        status: selectedStatus,
        dateRange: dateRange,
        sortBy: sortBy,
      });

      // Use cache only for first page, bypass for pagination
      const useCache = currentPage === 1;
      const cacheKey = `customers-list-page${currentPage}`;

      if (useCache) {
        const result = await criticalFetchService.fetchCriticalFirst(
          cacheKey,
          [
            {
              key: 'customers',
              url: `/api/customers?${params}`,
              options: {
                headers: {
                  'x-user-id': account.id,
                  'x-user-role': account.role || 'merchant',
                },
              },
            },
          ],
          []
        );

        const data = result.critical?.customers || result.customers;
        setCustomers(data?.data || []);
        setStats(data?.stats || {});
        setCampaigns(data?.filters?.campaigns || []);
        setStores(data?.filters?.stores || []);
      } else {
        // For pagination, fetch without cache
        const response = await fetch(`/api/customers?${params}`, {
          headers: {
            'x-user-id': account.id,
            'x-user-role': account.role || 'merchant',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch customers');

        const data = await response.json();
        setCustomers(data.data || []);
        setStats(data.stats || {});
        setCampaigns(data.filters?.campaigns || []);
        setStores(data.filters?.stores || []);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [account?.id, account?.role, currentPage, pageSize, searchQuery, selectedCampaign, selectedStore, selectedStatus, dateRange, sortBy]);

  useEffect(() => {
    if (account?.id) {
      fetchCustomers();
    }
  }, [account?.id, fetchCustomers]);

  // Auto-refetch customers when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && account?.id) {
        console.log("[Customers] Page visible - refetching customers");
        setCurrentPage(1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [account?.id]);

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setShowDrawer(true);
  };

  const formatWonReward = (card) => {
    if (!card) return null;
    const { reward_type, reward_value } = card;
    if (reward_type === 'discount' || reward_type === 'voucher') return `₹${reward_value} OFF`;
    if (reward_type === 'cashback') return `${reward_value}% OFF`;
    if (reward_type === 'freeItem') return card.reward_description || 'Free Gift';
    return reward_value ? `₹${reward_value} OFF` : null;
  };

  const statusColors = {
    initiated: '#6b7280',
    verified: '#3b82f6',
    scratched: '#f59e0b',
    revealed: '#f59e0b',
    redeemed: '#10b981',
    expired: '#ef4444',
    failed: '#ef4444'
  };

  const statusLabels = {
    initiated: 'Initiated',
    verified: 'Verified',
    scratched: 'Scratched',
    revealed: 'Revealed',
    redeemed: 'Claimed',
    expired: 'Expired',
    failed: 'Failed'
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

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <CustomerStatsCard
          icon="👥"
          label="Total Customers"
          value={stats.totalCustomers || 0}
        />
        <CustomerStatsCard
          icon="📅"
          label="Today's Customers"
          value={stats.todaysCustomers || 0}
        />
        <CustomerStatsCard
          icon="🎁"
          label="Rewards Awarded"
          value={stats.rewardsAwarded || 0}
        />
        {/* TODO: Rewards Claimed & Active Participants — enable when cashier integration is live
        <CustomerStatsCard
          icon="✅"
          label="Rewards Claimed"
          value={stats.rewardsClaimed || 0}
        />
        <CustomerStatsCard
          icon="⚡"
          label="Active Participants"
          value={stats.activeParticipants || 0}
        />
        */}
      </div>

      {/* Filters Section */}
      <div className={styles.filtersSection}>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, mobile, or campaign..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterControls}>
          {/* Campaign Filter */}
          <select
            value={selectedCampaign}
            onChange={(e) => {
              setSelectedCampaign(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.select}
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c._id} value={c._id}>
                {c.campaignName || c.name}
              </option>
            ))}
          </select>

          {/* Store Filter */}
          <select
            value={selectedStore}
            onChange={(e) => {
              setSelectedStore(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.select}
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.store_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.select}
          >
            <option value="all">All Status</option>
            <option value="initiated">Initiated</option>
            <option value="verified">Verified</option>
            <option value="scratched">Scratched</option>
            <option value="revealed">Revealed</option>
            <option value="redeemed">Claimed</option>
            <option value="expired">Expired</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.select}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.select}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </div>
      </div>

      {/* Customers List */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className={styles.empty}>
          <p>No customers found</p>
        </div>
      ) : (
        <>
          <div className={styles.customersList}>
            {customers.map((customer) => (
              <div
                key={customer._id}
                className={styles.customerCard}
                onClick={() => handleCustomerClick(customer)}
              >
                {/* Main Content Section */}
                <div className={styles.customerMainContent}>
                  {/* Left: Customer Info */}
                  <div className={styles.customerInfo}>
                    <div className={styles.customerName}>{customer.customer_name}</div>
                    <div className={styles.customerMeta}>
                      <span className={styles.mobile}>📱 {customer.customer_mobile}</span>
                      {customer.customer_email && (
                        <span className={styles.email}>✉️ {customer.customer_email}</span>
                      )}
                    </div>
                  </div>

                  {/* Center: Campaign & Store */}
                  <div className={styles.campaignStore}>
                    <div className={styles.campaign}>
                      <div className={styles.label}>Campaign</div>
                      <div className={styles.value}>
                        {customer.campaign_id?.campaignName || customer.campaign_id?.name}
                      </div>
                    </div>
                    <div className={styles.store}>
                      <div className={styles.label}>Store</div>
                      <div className={styles.value}>{customer.store_id?.store_name}</div>
                      <div className={styles.city}>{customer.store_id?.city}</div>
                    </div>
                  </div>

                  {/* Right: Reward & Status */}
                  <div className={styles.rewardStatus}>
                    <div className={styles.reward}>
                      <div className={styles.label}>
                        {formatWonReward(customer.scratch_card_id) ? 'Won' : 'Range'}
                      </div>
                      <div className={styles.value}>
                        {formatWonReward(customer.scratch_card_id)
                          || `₹${customer.range_id?.minAmount || 0} – ₹${customer.range_id?.maxAmount || 0}`}
                      </div>
                    </div>
                    <div
                      className={styles.statusBadge}
                      style={{ borderColor: statusColors[customer.status] }}
                    >
                      <div
                        className={styles.statusDot}
                        style={{ backgroundColor: statusColors[customer.status] }}
                      />
                      <span>{statusLabels[customer.status]}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Date & Icon */}
                <div className={styles.dateSection}>
                  <div className={styles.date}>
                    {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit'
                    })}
                  </div>
                  <div className={styles.participationIcon}>👤</div>
                </div>
              </div>
            ))}
          </div>

          {/* Detail Drawer */}
          <CustomerDetailDrawer
            isOpen={showDrawer}
            onClose={() => setShowDrawer(false)}
            customer={selectedCustomer}
          />
        </>
      )}
    </div>
  );
}
