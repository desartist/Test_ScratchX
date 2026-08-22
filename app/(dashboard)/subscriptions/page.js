'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  XCircle,
  Search,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import {
  useAdminSubscriptionsQuery,
  useUpdateSubscriptionMutation,
} from '@/hooks/queries/useAdminSubscriptionsQuery';
import { useSubscriptionPlansQuery } from '@/hooks/queries/useSubscriptionQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './subscriptions.module.css';

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

function ownerName(owner) {
  if (!owner) return '—';
  return owner.profile?.storeName || owner.profile?.companyName || owner.name || owner.email;
}

function SubscriptionsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [extendTarget, setExtendTarget] = useState(null);
  const [extendDays, setExtendDays] = useState('30');
  const [cancelTarget, setCancelTarget] = useState(null);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminSubscriptionsQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  });
  const updateMutation = useUpdateSubscriptionMutation();

  const subscriptions = data?.subscriptions || [];
  const metrics = data?.metrics || { total: 0, active: 0, trial: 0, expiring: 0, cancelled: 0, expired: 0 };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  const filtered = searchQuery
    ? subscriptions.filter((s) => ownerName(s.ownerId).toLowerCase().includes(searchQuery.toLowerCase()))
    : subscriptions;

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    updateMutation.mutate(
      { id: cancelTarget._id, action: 'cancel' },
      { onSettled: () => setCancelTarget(null) },
    );
  };

  const handleConfirmExtend = () => {
    if (!extendTarget) return;
    const days = Number(extendDays);
    if (!Number.isFinite(days) || days <= 0) return;
    updateMutation.mutate(
      { id: extendTarget._id, action: 'extend', extendDays: days },
      { onSettled: () => setExtendTarget(null) },
    );
  };

  return (
    <>
      <div className={styles.statGrid}>
        <StatCard icon={<CheckCircle2 />} value={metrics.active} label="Active" tone="green" onClick={() => { setStatusFilter('active'); setPage(1); }} />
        <StatCard icon={<Clock />} value={metrics.trial} label="Trial" onClick={() => { setStatusFilter('trial'); setPage(1); }} />
        <StatCard icon={<AlertTriangle />} value={metrics.expiring} label="Expiring Soon" tone="red" onClick={() => { setStatusFilter('expiring'); setPage(1); }} />
        <StatCard icon={<Ban />} value={metrics.cancelled} label="Cancelled" tone="gray" onClick={() => { setStatusFilter('cancelled'); setPage(1); }} />
        <StatCard icon={<XCircle />} value={metrics.expired} label="Expired" tone="red" onClick={() => { setStatusFilter('expired'); setPage(1); }} />
      </div>

      <div className={styles.filterSection}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by retailer/distributor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.viewTabs}>
          {['all', 'active', 'trial', 'expiring', 'past_due', 'cancelled', 'expired'].map((tab) => (
            <button
              key={tab}
              className={`${styles.viewTab} ${statusFilter === tab ? styles.active : ''}`}
              onClick={() => { setStatusFilter(tab); setPage(1); }}
            >
              {tab === 'all' ? 'All' : tab === 'past_due' ? 'Past Due' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading subscriptions..." />
      ) : error ? (
        <div className={styles.errorState}>
          <AlertCircle size={48} />
          <p>{error}</p>
          <button onClick={() => refetch()} className={styles.retryButton}>Try Again</button>
        </div>
      ) : (
        <div className={styles.tableSection}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Distributor</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>
                    <CreditCard size={32} />
                    <p>No subscriptions found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <p className={styles.name}>{ownerName(s.ownerId)}</p>
                      <p className={styles.subtext}>{s.ownerId?.email || '—'}</p>
                    </td>
                    <td>{s.ownerType === 'distributor' ? 'Distributor' : 'Retailer'}</td>
                    <td>{s.planType === 'SMART' ? 'Smart' : s.planType === 'CORE' ? 'Core' : s.planType || '—'}</td>
                    <td>{s.distributorId?.profile?.companyName || s.distributorId?.name || '—'}</td>
                    <td>{formatDate(s.unlimitedScratches?.validUntil)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge-${s.status}`] || ''}`}>{s.status}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {s.status !== 'cancelled' && (
                          <>
                            <button className={styles.actionBtn} onClick={() => { setExtendTarget(s); setExtendDays('30'); }}>
                              Extend
                            </button>
                            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => setCancelTarget(s)}>
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageButton} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              <span className={styles.pageLabel}>Page {page} of {totalPages}</span>
              <button className={styles.pageButton} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Extend modal */}
      {extendTarget && (
        <div className={styles.modalOverlay} onClick={() => setExtendTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Extend Subscription</h2>
              <button className={styles.modalClose} onClick={() => setExtendTarget(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.subtext}>
                Extend <strong>{ownerName(extendTarget.ownerId)}</strong>&apos;s scratch entitlement by:
              </p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Days</label>
                <input
                  type="number"
                  min="1"
                  className={styles.formInput}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setExtendTarget(null)}>Cancel</button>
              <button className={styles.submitButton} onClick={handleConfirmExtend} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Extending...' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirm */}
      {cancelTarget && (
        <div className={styles.modalOverlay} onClick={() => setCancelTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Cancel Subscription?</h2>
              <button className={styles.modalClose} onClick={() => setCancelTarget(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.subtext}>
                <strong>{ownerName(cancelTarget.ownerId)}</strong> will lose access to plan features immediately.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setCancelTarget(null)}>Keep Active</button>
              <button className={styles.submitButton} onClick={handleConfirmCancel} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// The real feature flags used on the actual retailer/wholesaler plan-picker
// (app/api/subscription/plans/route.js) — shown here exactly as sold, not
// the separate (unused-for-pricing) SubscriptionPlan Mongo collection.
const DISPLAY_FEATURES = [
  { key: 'multiStore', label: 'Multi-Store Access' },
  { key: 'whatsappIntegration', label: 'WhatsApp Access' },
  { key: 'advancedAnalytics', label: 'Advanced Analytics' },
  { key: 'basicCustomerInsights', label: 'Customer Insights' },
  { key: 'fraudProtection', label: 'Fraud Protection' },
  { key: 'prioritySupport', label: 'Priority Support' },
];

function PlansView() {
  const { data: plansJson, isPending: loading, error: queryError, refetch } = useSubscriptionPlansQuery();
  const error = queryError ? queryError.message : null;
  const plans = plansJson?.success ? plansJson.data || [] : [];

  if (loading) return <LoadingState message="Loading plans..." />;
  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={48} />
        <p>{error}</p>
        <button onClick={() => refetch()} className={styles.retryButton}>Try Again</button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.plansGrid}>
        {plans.map((plan) => (
          <div key={plan._id} className={styles.planCard}>
            <div className={styles.planCardHeader}>
              <h3 className={styles.planName}>{plan.displayName || plan.name}</h3>
              {plan.recommended && <span className={styles.planRecommendedBadge}>Recommended</span>}
            </div>
            <p className={styles.planDescription}>{plan.description}</p>

            <div className={styles.planPricing}>
              <div className={styles.planPrice}>
                <span className={styles.planPriceLabel}>Base (one-time)</span>
                <span className={styles.planPriceValue}>₹{Number(plan.price?.base || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className={styles.planPrice}>
                <span className={styles.planPriceLabel}>With GST</span>
                <span className={styles.planPriceValue}>₹{Number(plan.price?.withGST || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className={styles.planLimits}>
              <div className={styles.planLimitRow}>
                <span className={styles.planLimitLabel}>Entitlement Duration</span>
                <span className={styles.planLimitValue}>{plan.duration} days</span>
              </div>
              <div className={styles.planLimitRow}>
                <span className={styles.planLimitLabel}>Max Stores</span>
                <span className={styles.planLimitValue}>{plan.limits?.maxStores ?? '—'}</span>
              </div>
              {plan.limits?.additionalStorePrice > 0 && (
                <div className={styles.planLimitRow}>
                  <span className={styles.planLimitLabel}>Extra Store</span>
                  <span className={styles.planLimitValue}>
                    ₹{plan.limits.additionalStorePrice} (₹{plan.limits.additionalStoreWithGST} w/ GST)
                  </span>
                </div>
              )}
              <div className={styles.planLimitRow}>
                <span className={styles.planLimitLabel}>Team Members</span>
                <span className={styles.planLimitValue}>{plan.features?.teamMembers ?? plan.features?.teamMembersPerStore ?? '—'}</span>
              </div>
            </div>

            <div className={styles.planFeatures}>
              {DISPLAY_FEATURES.map((f) => (
                <div key={f.key} className={styles.planFeatureRow}>
                  {plan.features?.[f.key] ? (
                    <Check size={14} className={styles.featureOn} />
                  ) : (
                    <X size={14} className={styles.featureOff} />
                  )}
                  {f.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function SubscriptionsPage() {
  const [view, setView] = useState('subscriptions');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Subscriptions</h1>
            <p>Plan status, entitlements, and pricing across the platform</p>
          </div>
        </div>

        <div className={styles.viewTabs}>
          <button className={`${styles.viewTab} ${view === 'subscriptions' ? styles.active : ''}`} onClick={() => setView('subscriptions')}>
            Subscriptions
          </button>
          <button className={`${styles.viewTab} ${view === 'plans' ? styles.active : ''}`} onClick={() => setView('plans')}>
            Plans
          </button>
        </div>

        {view === 'subscriptions' ? <SubscriptionsView /> : <PlansView />}
      </div>
    </div>
  );
}
