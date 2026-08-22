'use client';

import React, { useState } from 'react';
import {
  IndianRupee,
  TrendingUp,
  Receipt,
  AlertCircle,
  FileWarning,
  Plus,
  X,
} from 'lucide-react';
import { useAdminAnalyticsQuery } from '@/hooks/queries/useAdminAnalyticsQuery';
import {
  useAdminPaymentsQuery,
  useUpdatePaymentMutation,
  useCreateManualPaymentMutation,
} from '@/hooks/queries/useAdminPaymentsQuery';
import { useDistributorMerchantsQuery } from '@/hooks/queries/useDistributorMerchantsQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './revenue.module.css';

const RANGE_OPTIONS = [
  { label: '30 Days', value: 30 },
  { label: '60 Days', value: 60 },
  { label: '90 Days', value: 90 },
];

const PAYMENT_ACTIONS = {
  created: [{ action: 'verify', label: 'Verify' }, { action: 'reject', label: 'Reject', danger: true }],
  pending: [{ action: 'markPaid', label: 'Mark Paid' }, { action: 'reject', label: 'Reject', danger: true }],
  success: [{ action: 'refund', label: 'Refund', danger: true }],
  failed: [{ action: 'verify', label: 'Retry Verify' }],
  refunded: [],
};

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

function PaymentsPanel() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const limit = 15;

  const { data, isPending: loading, error: queryError, refetch } = useAdminPaymentsQuery({
    page,
    limit,
    status: statusFilter || undefined,
  });
  const updateMutation = useUpdatePaymentMutation();

  const payments = data?.payments || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Payments</h2>
        <button className={styles.addPaymentBtn} onClick={() => setShowManualModal(true)}>
          <Plus size={16} />
          Add Manual Payment
        </button>
      </div>

      <div className={styles.filterTabs} style={{ marginBottom: 16 }}>
        {['', 'created', 'pending', 'success', 'failed', 'refunded'].map((s) => (
          <button
            key={s || 'all'}
            className={`${styles.filterTab} ${statusFilter === s ? styles.active : ''}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading payments..." />
      ) : error ? (
        <p className={styles.emptyInline}>{error}</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Amount</th>
                <th>Tax</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>No payments found</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.merchantId?.profile?.storeName || p.merchantId?.name || '—'}
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.merchantId?.email}</div>
                    </td>
                    <td>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td>₹{Number(p.tax || 0).toLocaleString('en-IN')}</td>
                    <td>{p.paymentMethod || p.paymentGateway || '—'}</td>
                    <td><span className={`${styles.badge} ${styles[`badge-${p.status}`] || ''}`}>{p.status}</span></td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        {(PAYMENT_ACTIONS[p.status] || []).map((a) => (
                          <button
                            key={a.action}
                            className={`${styles.actionBtn} ${a.danger ? styles.actionBtnDanger : ''}`}
                            disabled={updateMutation.isPending}
                            onClick={() => updateMutation.mutate({ id: p._id, action: a.action })}
                          >
                            {a.label}
                          </button>
                        ))}
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
        </>
      )}

      {showManualModal && <ManualPaymentModal onClose={() => setShowManualModal(false)} />}
    </div>
  );
}

function ManualPaymentModal({ onClose }) {
  const { data: merchantsData } = useDistributorMerchantsQuery({ limit: 200 });
  const merchants = merchantsData?.merchants || [];
  const createMutation = useCreateManualPaymentMutation();

  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('0');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!merchantId) { setFormError('Select a retailer'); return; }
    if (!amount || Number(amount) <= 0) { setFormError('Enter a valid amount'); return; }
    try {
      await createMutation.mutateAsync({ merchantId, amount: Number(amount), tax: Number(tax) || 0, description });
      onClose();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add Manual Payment</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Retailer *</label>
              <select className={styles.formInput} value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
                <option value="">Select a retailer...</option>
                {merchants.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.profile?.storeName || m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount (₹) *</label>
                <input type="number" className={styles.formInput} value={amount} onChange={(e) => setAmount(e.target.value)} min="1" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tax (₹)</label>
                <input type="number" className={styles.formInput} value={tax} onChange={(e) => setTax(e.target.value)} min="0" />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <input type="text" className={styles.formInput} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Offline bank transfer for Core plan" />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitButton} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isPending, error, refetch } = useAdminAnalyticsQuery(days);

  if (isPending) {
    return (
      <div className={styles.page}>
        <LoadingState message="Loading revenue analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error.message}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { revenue, invoices, subscriptions } = data;
  const maxDayRevenue = Math.max(1, ...revenue.byDay.map((d) => d.revenue));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Payments &amp; Revenue</h1>
            <p>Platform-wide revenue, invoicing, subscriptions, and payment management</p>
          </div>
          <div className={styles.filterTabs}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.filterTab} ${days === opt.value ? styles.active : ''}`}
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className={styles.statGrid}>
          <StatCard icon={<IndianRupee />} value={`₹${Number(revenue.total).toLocaleString('en-IN')}`} label="Total Revenue" />
          <StatCard icon={<Receipt />} value={revenue.transactions} label="Transactions" tone="green" />
          <StatCard icon={<TrendingUp />} value={`₹${Number(revenue.average).toLocaleString('en-IN')}`} label="Avg. Transaction" />
          <StatCard icon={<FileWarning />} value={`₹${Number(invoices.totalOutstanding).toLocaleString('en-IN')}`} label="Outstanding Invoices" tone="red" />
        </div>

        {/* Revenue trend */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Revenue Trend</h2>
          {revenue.byDay.length === 0 ? (
            <p className={styles.emptyInline}>No revenue recorded in this period.</p>
          ) : (
            <div className={styles.trendChart}>
              {revenue.byDay.map((d) => (
                <div key={d._id} className={styles.trendBarWrap} title={`₹${d.revenue.toLocaleString('en-IN')} on ${d._id}`}>
                  <div
                    className={styles.trendBar}
                    style={{ height: `${Math.max(4, (d.revenue / maxDayRevenue) * 100)}%` }}
                  />
                  <span className={styles.trendBarLabel}>{d._id.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.twoColGrid}>
          {/* Revenue by plan */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Revenue by Plan</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Revenue</th>
                  <th>Transactions</th>
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                {revenue.byPlan.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.emptyState}>
                      No plan revenue in this period
                    </td>
                  </tr>
                ) : (
                  revenue.byPlan.map((p) => (
                    <tr key={p.plan}>
                      <td>{p.plan || 'Unknown'}</td>
                      <td>₹{Number(p.revenue).toLocaleString('en-IN')}</td>
                      <td>{p.transactions}</td>
                      <td>₹{Number(p.average).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subscription breakdown */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Active Subscriptions by Plan</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Count</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.byPlan.length === 0 ? (
                  <tr>
                    <td colSpan="3" className={styles.emptyState}>
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subscriptions.byPlan.map((p) => (
                    <tr key={p.plan}>
                      <td>{p.plan || 'Unknown'}</td>
                      <td>{p.count}</td>
                      <td>{p.percentage}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoices */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Invoices</h2>
          <div className={styles.invoiceSummary}>
            <div>
              <p className={styles.metricLabel}>Total</p>
              <p className={styles.metricValue}>{invoices.total}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>Paid</p>
              <p className={styles.metricValue}>{invoices.paid}</p>
            </div>
            <div>
              <p className={styles.metricLabel}>Outstanding</p>
              <p className={styles.metricValue}>{invoices.outstanding}</p>
            </div>
          </div>
        </div>

        <PaymentsPanel />
      </div>
    </div>
  );
}
