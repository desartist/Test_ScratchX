'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Eye,
  Users,
  UserCheck,
  Store,
  Wallet,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  useAdminDistributorDetailQuery,
  useUpdateDistributorStatusMutation,
} from '@/hooks/queries/useAdminDistributorsQuery';
import LoadingState from '@/components/common/LoadingState';
import StatCard from '@/components/dashboard/shared/StatCard';
import styles from './distributorDetail.module.css';

function getInitials(name) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export default function DistributorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const distributorId = params.id;

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const statusMutation = useUpdateDistributorStatusMutation();

  const {
    data,
    isPending: loading,
    error: queryError,
    refetch,
  } = useAdminDistributorDetailQuery(distributorId);

  const error = queryError ? queryError.message : null;

  if (loading) {
    return (
      <div className={styles.page}>
        <LoadingState message="Loading distributor details..." />
      </div>
    );
  }

  if (error || !data?.distributor) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button onClick={() => router.push('/distributors')} className={styles.backButton}>
              <ArrowLeft size={18} />
              Back
            </button>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error || 'Distributor not found'}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { distributor, metrics, inventory, commission, retailers } = data;

  const handleConfirmStatusChange = () => {
    const nextStatus = distributor.status === 'suspended' ? 'active' : 'suspended';
    statusMutation.mutate(
      { id: distributor._id, status: nextStatus },
      { onSettled: () => setStatusConfirmOpen(false) },
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={() => router.push('/distributors')} className={styles.backButton}>
            <ArrowLeft size={18} />
            Back
          </button>
          <button
            className={`${styles.statusActionBtn} ${distributor.status === 'suspended' ? styles.activateBtn : styles.suspendBtn}`}
            onClick={() => setStatusConfirmOpen(true)}
            disabled={statusMutation.isPending}
          >
            {distributor.status === 'suspended' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {distributor.status === 'suspended' ? 'Activate Distributor' : 'Suspend Distributor'}
          </button>
        </div>

        {/* Hero card */}
        <div className={styles.heroCard}>
          <div className={styles.avatar}>{getInitials(distributor.name)}</div>
          <div className={styles.heroContent}>
            <h1 className={styles.distributorName}>{distributor.name}</h1>
            {distributor.profile?.companyName && (
              <p className={styles.companyName}>{distributor.profile.companyName}</p>
            )}
            <div className={styles.headerBadges}>
              <span className={`${styles.badge} ${styles[`badge-${distributor.status || 'pending'}`]}`}>
                {distributor.status === 'active' ? '✓' : '●'} {distributor.status || 'pending'}
              </span>
              <span className={`${styles.badge} ${styles.infoBadge}`}>{distributor.email}</span>
              {distributor.phone && (
                <span className={`${styles.badge} ${styles.infoBadge}`}>{distributor.phone}</span>
              )}
              {distributor.profile?.territory && (
                <span className={`${styles.badge} ${styles.infoBadge}`}>
                  {distributor.profile.territory}
                  {distributor.profile.region ? ` · ${distributor.profile.region}` : ''}
                </span>
              )}
              {distributor.profile?.commissionRate != null && (
                <span className={`${styles.badge} ${styles.infoBadge}`}>
                  {distributor.profile.commissionRate}% commission
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className={styles.statsGrid}>
          <StatCard icon={<Users />} label="Total Retailers" value={metrics.totalRetailers} />
          <StatCard icon={<UserCheck />} label="Active Retailers" value={metrics.activeRetailers} tone="green" />
          <StatCard icon={<Store />} label="Wholesale Businesses" value={metrics.wholesaleCount} />
          <StatCard icon={<Wallet />} label="Earning This Month" value={formatCurrency(metrics.monthlyEarning)} />
        </div>

        {/* Inventory + Commission */}
        <div className={styles.twoColGrid}>
          <div className={styles.panelCard}>
            <h3 className={styles.panelTitle}>Scratch Card Inventory</h3>
            {['core', 'smart'].map((key) => (
              <div className={styles.planRow} key={key}>
                <div>
                  <div className={styles.planLabel}>{key === 'core' ? 'Core' : 'Smart'} Plan</div>
                  <div className={styles.planSub}>
                    {inventory[key].totalAssigned} assigned / {inventory[key].totalPurchased} purchased
                  </div>
                </div>
                <div className={styles.planValue}>{inventory[key].totalRemaining} left</div>
              </div>
            ))}
          </div>

          <div className={styles.panelCard}>
            <h3 className={styles.panelTitle}>Commission Summary</h3>
            <div className={styles.commissionRow}>
              <span className={styles.commissionLabel}>Total Earned</span>
              <span className={styles.commissionValue}>{formatCurrency(commission.earned)}</span>
            </div>
            <div className={styles.commissionRow}>
              <span className={styles.commissionLabel}>Approved</span>
              <span className={styles.commissionValue}>{formatCurrency(commission.approved)}</span>
            </div>
            <div className={styles.commissionRow}>
              <span className={styles.commissionLabel}>Paid Out</span>
              <span className={styles.commissionValue}>{formatCurrency(commission.paid)}</span>
            </div>
            <div className={styles.commissionRow}>
              <span className={styles.commissionLabel}>Pending ({commission.pending})</span>
              <span className={styles.commissionValue}>{formatCurrency(commission.pendingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Retailers */}
        <h2 className={styles.sectionHeading}>Assigned Retailers</h2>
        <div className={styles.tableSection}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Business</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {retailers.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.emptyState}>
                    No retailers assigned to this distributor yet.
                  </td>
                </tr>
              ) : (
                retailers.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <p className={styles.retailerName}>{r.name || '—'}</p>
                      <p className={styles.retailerEmail}>{r.email}</p>
                    </td>
                    <td>{r.profile?.storeName || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge-${r.status || 'pending'}`]}`}>
                        {r.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td>
                      <Link href={`/retailers/${r._id}`} className={styles.viewLink} title="View retailer">
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend/Activate confirmation */}
      {statusConfirmOpen && (
        <div className={styles.modalOverlay} onClick={() => setStatusConfirmOpen(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.confirmIcon} ${distributor.status === 'suspended' ? styles.confirmIconGreen : ''}`}
            >
              {distributor.status === 'suspended' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            </div>
            <h2 className={styles.confirmTitle}>
              {distributor.status === 'suspended' ? 'Activate Distributor?' : 'Suspend Distributor?'}
            </h2>
            <p className={styles.confirmMessage}>
              {distributor.status === 'suspended' ? (
                <>
                  <strong>{distributor.name}</strong> will regain access and be able to log in again.
                </>
              ) : (
                <>
                  <strong>{distributor.name}</strong> will lose access immediately and won&apos;t be able to log in until reactivated.
                </>
              )}
            </p>
            <div className={styles.confirmFooter}>
              <button className={styles.confirmCancelBtn} onClick={() => setStatusConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className={`${styles.confirmActionBtn} ${distributor.status === 'suspended' ? styles.confirmActivateBtn : styles.confirmSuspendBtn}`}
                onClick={handleConfirmStatusChange}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending
                  ? 'Please wait...'
                  : distributor.status === 'suspended'
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
