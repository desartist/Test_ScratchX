'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Store,
  Calendar,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ShieldCheck,
  ClipboardList,
  Megaphone,
  Users,
  Ticket,
} from 'lucide-react';
import {
  useDistributorMerchantDetailQuery,
  useDistributorMerchantCustomersQuery,
  useUpdateMerchantStatusMutation,
} from '@/hooks/queries/useDistributorMerchantDetailQuery';
import { useAuthContext } from '@/components/auth/AuthContext';
import { getAccountInitials } from '@/lib/accountDisplay';
import LoadingState from '@/components/common/LoadingState';
import StatCard from '@/components/dashboard/shared/StatCard';
import CustomerDetailDrawer from '@/components/customers/CustomerDetailDrawer';
import styles from './retailerDetail.module.css';

const STATUS_COLORS = {
  initiated: '#6b7280',
  verified: '#3b82f6',
  scratched: '#f59e0b',
  revealed: '#f59e0b',
  redeemed: '#10b981',
  expired: '#ef4444',
  failed: '#ef4444',
};

const STATUS_LABELS = {
  initiated: 'Initiated',
  verified: 'Verified',
  scratched: 'Scratched',
  revealed: 'Revealed',
  redeemed: 'Claimed',
  expired: 'Expired',
  failed: 'Failed',
};

const STATUS_ICONS = {
  active: CheckCircle2,
  pending: Clock,
  suspended: XCircle,
  inactive: MinusCircle,
};

// Store status, Campaign status, and Account status (team members) each have
// their own enum — mapped to the same dot-color language used for customer
// participation status above, but kept separate since the value sets differ.
const GENERIC_STATUS_COLORS = {
  active: '#10b981',
  inactive: '#6b7280',
  suspended: '#ef4444',
  deleted: '#ef4444',
  deactivated: '#ef4444',
  pending: '#f59e0b',
  draft: '#6b7280',
  paused: '#f59e0b',
  ended: '#6b7280',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatWonReward(card) {
  if (!card) return null;
  const { reward_type, reward_value, reward_description } = card;
  if (reward_type === 'discount' || reward_type === 'voucher') return `₹${reward_value} OFF`;
  if (reward_type === 'cashback') return `${reward_value}% OFF`;
  if (reward_type === 'freeItem') return reward_description || 'Free Gift';
  return reward_value ? `₹${reward_value} OFF` : null;
}

export default function RetailerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const retailerId = params.id;

  const { account } = useAuthContext();
  const isSuperAdmin = account?.role === 'Super_Admin';
  const statusMutation = useUpdateMerchantStatusMutation();
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const {
    data: merchantData,
    isPending: merchantLoading,
    error: merchantQueryError,
    refetch: refetchMerchant,
  } = useDistributorMerchantDetailQuery(retailerId);

  const customerParams = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
      status: selectedStatus,
      dateRange,
    }),
    [currentPage, pageSize, searchQuery, selectedStatus, dateRange],
  );

  const {
    data: customersData,
    isPending: customersLoading,
  } = useDistributorMerchantCustomersQuery(retailerId, customerParams);

  const merchant = merchantData?.merchant;
  const summary = merchantData?.summary;
  const merchantError = merchantQueryError ? merchantQueryError.message : null;

  const handleConfirmStatusChange = () => {
    if (!merchant) return;
    const nextStatus = merchant.status === 'suspended' ? 'active' : 'suspended';
    statusMutation.mutate(
      { id: merchant._id, status: nextStatus },
      { onSettled: () => setStatusConfirmOpen(false) },
    );
  };

  const customers = customersData?.data || [];
  const stats = customersData?.stats || {};
  const pagination = customersData?.pagination || { page: 1, pages: 1 };

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setShowDrawer(true);
  };

  if (merchantLoading) {
    return (
      <div className={styles.page}>
        <LoadingState message="Loading retailer details..." />
      </div>
    );
  }

  if (merchantError || !merchant) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button onClick={() => router.push('/retailers')} className={styles.backButton} title="Go back">
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{merchantError || 'Retailer not found'}</p>
            <button onClick={() => refetchMerchant()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const storeName = merchant.profile?.storeName || merchant.name;
  // Prefer the actual business address (filled in via Settings > Business
  // Information); fall back to the legacy onboarding-time profile fields.
  const location =
    [merchant.businessInfo?.address, merchant.businessInfo?.city, merchant.businessInfo?.state, merchant.businessInfo?.pincode]
      .filter(Boolean)
      .join(', ') ||
    [merchant.profile?.storeLocation, merchant.profile?.storeAddress].filter(Boolean).join(' · ');
  const businessType = merchant.profile?.businessType || merchant.profile?.businessModel;
  const plan = merchant.subscription?.planType;
  const stores = merchantData?.stores || [];
  const campaigns = merchantData?.campaigns || [];
  const team = merchantData?.team || [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={() => router.push('/retailers')} className={styles.backButton} title="Go back">
            <ArrowLeft size={18} />
            Back
          </button>
          {isSuperAdmin && (
            <button
              className={`${styles.statusActionBtn} ${merchant.status === 'suspended' ? styles.activateBtn : styles.suspendBtn}`}
              onClick={() => setStatusConfirmOpen(true)}
              disabled={statusMutation.isPending}
            >
              {merchant.status === 'suspended' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {merchant.status === 'suspended' ? 'Activate Retailer' : 'Suspend Retailer'}
            </button>
          )}
        </div>

        {/* Hero card */}
        <div className={styles.heroCard}>
          <div className={styles.heroDots} />
          <div className={styles.heroBlob} />
          <div className={styles.heroDotSm1} />
          <div className={styles.heroDotSm2} />
          <div className={styles.heroDotSm3} />

          <div className={styles.avatarWrap}>
            <div className={styles.avatarGlow} />
            <div className={styles.avatar}>{getAccountInitials({ name: storeName })}</div>
          </div>

          <div className={styles.heroContent}>
            <h1 className={styles.storeName}>{storeName}</h1>
            {merchant.name !== storeName && <p className={styles.ownerName}>{merchant.name}</p>}
            <div className={styles.headerBadges}>
              {(() => {
                const StatusIcon = STATUS_ICONS[merchant.status] || Clock;
                return (
                  <span className={`${styles.badge} ${styles[`badge-${merchant.status || 'pending'}`]}`}>
                    <StatusIcon size={13} />
                    {merchant.status || 'pending'}
                  </span>
                );
              })()}
              {plan && (
                <span className={`${styles.badge} ${styles.planBadge}`}>
                  <ShieldCheck size={13} />
                  {plan === 'SMART' ? 'Smart' : 'Core'} Plan
                  {merchant.subscription?.status ? ` · ${merchant.subscription.status}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Retailer info */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={`${styles.infoIcon} ${styles['icon-purple']}`}>
              <Mail size={18} />
            </div>
            <p className={styles.infoLabel}>Email</p>
            <p className={styles.infoValue}>{merchant.email}</p>
          </div>
          <div className={styles.infoItem}>
            <div className={`${styles.infoIcon} ${styles['icon-blue']}`}>
              <Phone size={18} />
            </div>
            <p className={styles.infoLabel}>Phone</p>
            <p className={`${styles.infoValue} ${!(merchant.profile?.phoneNumber || merchant.phone) ? styles.infoValueEmpty : ''}`}>
              {merchant.profile?.phoneNumber || merchant.phone || 'Not provided'}
            </p>
          </div>
          <div className={styles.infoItem}>
            <div className={`${styles.infoIcon} ${styles['icon-green']}`}>
              <MapPin size={18} />
            </div>
            <p className={styles.infoLabel}>Location</p>
            <p className={`${styles.infoValue} ${!location ? styles.infoValueEmpty : ''}`}>
              {location || 'Not provided'}
            </p>
          </div>
          <div className={styles.infoItem}>
            <div className={`${styles.infoIcon} ${styles['icon-orange']}`}>
              <Store size={18} />
            </div>
            <p className={styles.infoLabel}>Business Type</p>
            <p className={`${styles.infoValue} ${!businessType ? styles.infoValueEmpty : ''}`}>
              {businessType || 'Not provided'}
            </p>
          </div>

          <div className={`${styles.infoItem} ${styles.infoItemWide}`}>
            <div className={`${styles.infoIcon} ${styles['icon-pink']}`}>
              <Calendar size={18} />
            </div>
            <div>
              <p className={styles.infoLabel}>Joined</p>
              <p className={styles.infoValue}>
                {merchant.createdAt
                  ? new Date(merchant.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
            <ClipboardList size={84} className={styles.infoWatermark} />
          </div>
        </div>

        {/* Overview (Distributor view — Super_Admin gets the richer Business
            Summary below instead, which already includes these counts) */}
        {!isSuperAdmin && (
          <>
            <h2 className={styles.sectionHeading}>Overview</h2>
            <div className={styles.statsGrid}>
              <StatCard icon={<Store />} label="Stores" value={stores.length} />
              <StatCard icon={<Megaphone />} label="Campaigns" value={campaigns.length} />
              <StatCard icon={<Users />} label="Team Members" value={team.length} />
            </div>
          </>
        )}

        {/* Business Summary (Super_Admin only — platform-wide view of this retailer) */}
        {isSuperAdmin && summary && (
          <>
            <h2 className={styles.sectionHeading}>Business Summary</h2>
            <div className={styles.statsGrid}>
              <StatCard icon={<Store />} label="Stores" value={summary.storeCount} />
              <StatCard icon={<Megaphone />} label="Campaigns" value={summary.campaignCount} />
              <StatCard icon={<Users />} label="Customers" value={summary.customerCount} />
              <StatCard
                icon={<Ticket />}
                label="Scratches Remaining"
                value={
                  (summary.scratchBalance?.total_scratch_cards || 0) -
                  (summary.scratchBalance?.used_scratch_cards || 0)
                }
              />
            </div>
            {summary.distributorName && (
              <p className={styles.distributorNote}>
                Onboarded via distributor: <strong>{summary.distributorName}</strong>
              </p>
            )}
          </>
        )}

        {/* Stores */}
        <h2 className={styles.sectionHeading}>Stores ({stores.length})</h2>
        {stores.length === 0 ? (
          <div className={styles.tableWrap}>
            <p className={styles.emptyText}>This retailer hasn&apos;t created any stores yet.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Address</th>
                  <th>Manager</th>
                  <th>Campaigns</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store._id} className={styles.staticRow}>
                    <td className={styles.customerName}>{store.store_name}</td>
                    <td>{[store.city, store.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>{store.managerName || '—'}</td>
                    <td>{store.campaignCount}</td>
                    <td>
                      <span
                        className={styles.statusPill}
                        style={{ borderColor: GENERIC_STATUS_COLORS[store.status] }}
                      >
                        <span
                          className={styles.statusDot}
                          style={{ backgroundColor: GENERIC_STATUS_COLORS[store.status] }}
                        />
                        {store.status}
                      </span>
                    </td>
                    <td>{formatDate(store.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Campaigns */}
        <h2 className={styles.sectionHeading}>Campaigns ({campaigns.length})</h2>
        {campaigns.length === 0 ? (
          <div className={styles.tableWrap}>
            <p className={styles.emptyText}>This retailer hasn&apos;t created any campaigns yet.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Allocated</th>
                  <th>Used</th>
                  <th>Redeemed</th>
                  <th>Stores</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign._id} className={styles.staticRow}>
                    <td className={styles.customerName}>{campaign.campaignName}</td>
                    <td>
                      <span
                        className={styles.statusPill}
                        style={{ borderColor: GENERIC_STATUS_COLORS[campaign.status] }}
                      >
                        <span
                          className={styles.statusDot}
                          style={{ backgroundColor: GENERIC_STATUS_COLORS[campaign.status] }}
                        />
                        {campaign.status}
                      </span>
                    </td>
                    <td>{formatDate(campaign.startDate)}</td>
                    <td>{formatDate(campaign.endDate)}</td>
                    <td>{campaign.allocated_scratch_cards ?? 0}</td>
                    <td>{campaign.used_scratch_cards ?? 0}</td>
                    <td>{campaign.redeemed_scratch_cards ?? 0}</td>
                    <td>{campaign.assignedStoreCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Team Members */}
        <h2 className={styles.sectionHeading}>Team Members ({team.length})</h2>
        {team.length === 0 ? (
          <div className={styles.tableWrap}>
            <p className={styles.emptyText}>This retailer hasn&apos;t added any store staff yet.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Store</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member._id} className={styles.staticRow}>
                    <td className={styles.customerName}>{member.name}</td>
                    <td>{member.role === 'Store_Manager' ? 'Store Manager' : 'Store Staff'}</td>
                    <td>{member.storeName || '—'}</td>
                    <td>{member.email}</td>
                    <td>{member.phone || '—'}</td>
                    <td>
                      <span
                        className={styles.statusPill}
                        style={{ borderColor: GENERIC_STATUS_COLORS[member.status] }}
                      >
                        <span
                          className={styles.statusDot}
                          style={{ backgroundColor: GENERIC_STATUS_COLORS[member.status] }}
                        />
                        {member.status}
                      </span>
                    </td>
                    <td>{formatDate(member.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Customers */}
        {/* <h2 className={styles.sectionHeading}>Customers</h2> */}

        {/* <div className={styles.statsGrid}>
          <CustomerStatsCard icon="👥" label="Total Customers" value={stats.totalCustomers || 0} />
          <CustomerStatsCard icon="📅" label="Today's Customers" value={stats.todaysCustomers || 0} />
          <CustomerStatsCard icon="🎁" label="Rewards Awarded" value={stats.rewardsAwarded || 0} />
          <CustomerStatsCard icon="✅" label="Rewards Claimed" value={stats.rewardsClaimed || 0} />
        </div>

        <div className={styles.filtersSection}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name or mobile..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

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
        </div> */}

        {/* {customersLoading ? (
          <LoadingState message="Loading customers..." />
        ) : customers.length === 0 ? (
          <div className={styles.tableWrap}>
            <p className={styles.emptyText}>No customers found for this retailer.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Campaign</th>
                    <th>Store</th>
                    <th>Reward</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id} onClick={() => handleCustomerClick(customer)}>
                      <td className={styles.customerName}>{customer.customer_name}</td>
                      <td>{customer.customer_mobile}</td>
                      <td>{customer.campaign_id?.campaignName || customer.campaign_id?.name || '—'}</td>
                      <td>{customer.store_id?.store_name || '—'}</td>
                      <td>
                        {formatWonReward(customer.scratch_card_id) ||
                          (customer.range_id
                            ? `₹${customer.range_id.minAmount || 0} – ₹${customer.range_id.maxAmount || 0}`
                            : '—')}
                      </td>
                      <td>
                        <span
                          className={styles.statusPill}
                          style={{ borderColor: STATUS_COLORS[customer.status] }}
                        >
                          <span
                            className={styles.statusDot}
                            style={{ backgroundColor: STATUS_COLORS[customer.status] }}
                          />
                          {STATUS_LABELS[customer.status] || customer.status}
                        </span>
                      </td>
                      <td>
                        {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className={styles.pageLabel}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <CustomerDetailDrawer
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          customer={selectedCustomer}
        /> */}
      </div>

      {/* Suspend/Activate confirmation (Super_Admin only) */}
      {statusConfirmOpen && (
        <div className={styles.modalOverlay} onClick={() => setStatusConfirmOpen(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.confirmIcon} ${merchant.status === 'suspended' ? styles.confirmIconGreen : ''}`}
            >
              {merchant.status === 'suspended' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            </div>
            <h2 className={styles.confirmTitle}>
              {merchant.status === 'suspended' ? 'Activate Retailer?' : 'Suspend Retailer?'}
            </h2>
            <p className={styles.confirmMessage}>
              {merchant.status === 'suspended' ? (
                <>
                  <strong>{storeName}</strong> will regain access and be able to log in again.
                </>
              ) : (
                <>
                  <strong>{storeName}</strong> will lose access immediately and won&apos;t be able to log in until reactivated.
                </>
              )}
            </p>
            <div className={styles.confirmFooter}>
              <button className={styles.confirmCancelBtn} onClick={() => setStatusConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className={`${styles.confirmActionBtn} ${merchant.status === 'suspended' ? styles.confirmActivateBtn : styles.confirmSuspendBtn}`}
                onClick={handleConfirmStatusChange}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending
                  ? 'Please wait...'
                  : merchant.status === 'suspended'
                    ? 'Activate'
                    : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
