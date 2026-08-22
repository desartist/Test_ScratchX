'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  AlertCircle,
  Eye,
  Phone,
  Check,
  Filter,
} from 'lucide-react';
import { useDistributorMerchantsQuery } from '@/hooks/queries/useDistributorMerchantsQuery';
import { useAuthContext } from '@/components/auth/AuthContext';
import LoadingState from '@/components/common/LoadingState';
import AddBusinessModal from '@/components/distributor/AddBusinessModal';
import WhatsAppButton from '@/components/whatsapp/WhatsAppButton';
import styles from './retailers.module.css';

const STATUS_OPTIONS = ['all', 'active', 'pending', 'suspended'];

function StatusFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <span className={styles.statusFilterWrap} ref={ref}>
      Status
      <button
        type="button"
        className={`${styles.statusFilterBtn} ${value !== 'all' ? styles.statusFilterBtnActive : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by status"
      >
        <Filter size={13} />
      </button>
      {open && (
        <ul className={styles.statusFilterMenu} role="listbox">
          {STATUS_OPTIONS.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              className={`${styles.statusFilterOption} ${value === opt ? styles.statusFilterOptionActive : ''}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
              {value === opt && <Check size={13} />}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function getInitials(name) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function getDaysLeftDisplay(merchant) {
  const validUntil = merchant.subscription?.unlimitedScratches?.validUntil;
  if (!validUntil) return '—';
  const daysLeft = Math.ceil((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return 'Lapsed';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
}

export default function RetailersPage() {
  const { account } = useAuthContext();
  const isSuperAdmin = account?.role === 'Super_Admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessModelFilter, setBusinessModelFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const { data, isPending: loading, error: queryError, refetch } = useDistributorMerchantsQuery({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    businessModel: businessModelFilter !== 'all' ? businessModelFilter : undefined,
  });
  const merchants = data?.merchants || [];
  const metrics = data?.metrics || { total: 0, active: 0, pending: 0, retail: 0, wholesale: 0 };
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Businesses </h1>
          </div>
        </div>

        {/* Business Model Tabs */}
        <div className={styles.businessModelTabsRow}>
          <div className={styles.filterTabs}>
            {[
              { value: 'all', label: 'All', count: metrics.total },
              { value: 'Retail', label: 'Retailers', count: metrics.retail },
              { value: 'Wholesale', label: 'Wholesalers', count: metrics.wholesale },
            ].map((tab) => (
              <button
                key={tab.value}
                className={`${styles.filterTab} ${businessModelFilter === tab.value ? styles.active : ''}`}
                onClick={() => setBusinessModelFilter(tab.value)}
              >
                {tab.label} · {tab.count}
              </button>
            ))}
          </div>
        </div>
             
        {/* Search & Filters */}
        <div className={styles.filterSection}>
          <button className={styles.primaryButton} onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Add New Business
          </button>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingState message="Loading retailers..." />
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        ) : (
          <div className={styles.tableSection}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>B. Model</th>
                  <th>Owner</th>
                  <th>City</th>
                  {isSuperAdmin && <th>Distributor</th>}
                  <th>Plan</th>
                  <th>
                    <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
                  </th>
                  <th>Days Left</th>
                  {isSuperAdmin && <th>Stores</th>}
                  {isSuperAdmin && <th>Campaigns</th>}
                  {isSuperAdmin && <th>Customers</th>}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {merchants.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 12 : 8} className={styles.emptyState}>
                      <AlertCircle size={32} />
                      <p>No businesses found</p>
                      <button className={styles.createLink} onClick={() => setShowModal(true)}>
                        Add your first business
                      </button>
                    </td>
                  </tr>
                ) : (
                  merchants.map((merchant) => {
                    const isWholesale = merchant.profile?.businessModel === 'Wholesale';
                    const phone = merchant.profile?.phoneNumber || merchant.phone;
                    return (
                    <tr key={merchant._id}>
                      <td>
                        <div className={styles.retailerInfo}>
                          <div className={styles.avatar}>
                            {getInitials(merchant.profile?.storeName || merchant.name)}
                          </div>
                          <div>
                            <p className={styles.name}>
                              {merchant.profile?.storeName || '—'}
                            </p>
                            <p className={styles.email}>{merchant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.typeBadge} ${isWholesale ? styles.typeBadgeWholesale : styles.typeBadgeRetail}`}
                        >
                          {isWholesale ? 'Wholesaler' : 'Retailer'}
                        </span>
                      </td>
                      <td>{merchant.name || '—'}</td>
                      <td>{merchant.profile?.storeLocation || merchant.profile?.storeAddress || '—'}</td>
                      {isSuperAdmin && <td>{merchant.distributorName || '—'}</td>}
                      <td>
                        {merchant.subscription?.planType
                          ? `${merchant.subscription.planType === 'SMART' ? 'Smart' : 'Core'}`
                          : 'No plan'}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${styles[`badge-${merchant.status || 'pending'}`]}`}
                        >
                          {merchant.status === 'active' ? '✓' : '●'} {merchant.status || 'pending'}
                        </span>
                      </td>
                      <td>{getDaysLeftDisplay(merchant)}</td>
                      {isSuperAdmin && <td>{merchant.storeCount ?? 0}</td>}
                      {isSuperAdmin && <td>{merchant.campaignCount ?? 0}</td>}
                      {isSuperAdmin && <td>{merchant.customerCount ?? 0}</td>}
                      <td>
                        <div className={styles.actions}>
                          <Link
                            href={`/retailers/${merchant._id}`}
                            className={styles.actionBtn}
                            title="View details"
                          >
                            <Eye size={16} />
                          </Link>
                          {phone ? (
                            <a
                              href={`tel:${merchant.profile?.countryCode || ''}${phone}`}
                              className={styles.actionBtn}
                              title="Call"
                            >
                              <Phone size={16} />
                            </a>
                          ) : (
                            <span
                              className={`${styles.actionBtn} ${styles.actionBtnDisabled}`}
                              title="No phone number"
                            >
                              <Phone size={16} />
                            </span>
                          )}
                          <WhatsAppButton
                            phoneNumber={phone}
                            countryCode={merchant.profile?.countryCode || '+91'}
                            defaultMessage={`Hi ${merchant.name || 'there'}, this is your ScratchX distributor reaching out regarding ${merchant.profile?.storeName || 'your business'}.`}
                            recipientType="business"
                            businessId={merchant._id}
                            placeholderValues={{
                              customerName: merchant.name || '',
                              businessName: merchant.profile?.storeName || '',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddBusinessModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
