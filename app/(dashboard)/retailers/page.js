'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  Plus,
  Search,
  X,
  AlertCircle,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useDistributorMerchantsQuery,
  useCreateMerchantMutation,
  useUpdateMerchantStatusMutation,
} from '@/hooks/queries/useDistributorMerchantsQuery';
import styles from './retailers.module.css';

const EMPTY_FORM = {
  storeName: '',
  name: '',
  countryCode: '+91',
  phoneNumber: '',
  email: '',
  planType: '',
  password: '',
};

function getInitials(name) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function RetailersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [inventory, setInventory] = useState(null);

  const { data, isPending: loading, error: queryError, refetch } = useDistributorMerchantsQuery({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const merchants = data?.merchants || [];
  const metrics = data?.metrics || { total: 0, active: 0, pending: 0 };
  const error = queryError ? queryError.message : null;

  const createMutation = useCreateMerchantMutation();
  const statusMutation = useUpdateMerchantStatusMutation();

  useEffect(() => {
    if (!showModal) return;
    fetch('/api/distributor/inventory', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setInventory(json.data);
      })
      .catch(() => {});
  }, [showModal]);

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

  const handleCreateMerchant = async (e) => {
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

    try {
      await createMutation.mutateAsync(formData);
      handleCloseModal();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleToggleStatus = (merchant) => {
    setStatusTarget(merchant);
  };

  const handleCancelStatusChange = () => {
    setStatusTarget(null);
  };

  const handleConfirmStatusChange = () => {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === 'suspended' ? 'active' : 'suspended';
    statusMutation.mutate(
      { id: statusTarget._id, status: nextStatus },
      { onSettled: () => setStatusTarget(null) },
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Retailers Management</h1>
            <p>Manage and monitor the retail merchants on your network</p>
          </div>
          <button className={styles.primaryButton} onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Add Retailer
          </button>
        </div>

        {/* Metrics */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>
              <Users size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Retailers</p>
              <p className={styles.metricValue}>{metrics.total}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>
              <UserCheck size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Active</p>
              <p className={styles.metricValue}>{metrics.active}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-orange']}`}>
            <div className={styles.metricIcon}>
              <Clock size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Pending</p>
              <p className={styles.metricValue}>{metrics.pending}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className={styles.filterSection}>
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

          <div className={styles.filterTabs}>
            {['all', 'active', 'pending', 'suspended'].map((tab) => (
              <button
                key={tab}
                className={`${styles.filterTab} ${statusFilter === tab ? styles.active : ''}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading retailers...</p>
          </div>
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
                  <th>Retailer</th>
                  <th>Contact</th>
                  <th>Store</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>
                      <AlertCircle size={32} />
                      <p>No retailers found</p>
                      <button className={styles.createLink} onClick={() => setShowModal(true)}>
                        Add your first retailer
                      </button>
                    </td>
                  </tr>
                ) : (
                  merchants.map((merchant) => (
                    <tr key={merchant._id}>
                      <td>
                        <div className={styles.retailerInfo}>
                          <div className={styles.avatar}>
                            {getInitials(merchant.profile?.storeName || merchant.name)}
                          </div>
                          <div>
                            <p className={styles.name}>
                              {merchant.profile?.storeName || merchant.name}
                            </p>
                            <p className={styles.email}>{merchant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>{merchant.profile?.phoneNumber || merchant.phone || '—'}</td>
                      <td>{merchant.profile?.storeLocation || merchant.profile?.storeAddress || '—'}</td>
                      <td>
                        {merchant.subscription?.planType
                          ? `${merchant.subscription.planType === 'SMART' ? 'Smart' : 'Core'} (${merchant.subscription.status})`
                          : 'No plan'}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${styles[`badge-${merchant.status || 'pending'}`]}`}
                        >
                          {merchant.status === 'active' ? '✓' : '●'} {merchant.status || 'pending'}
                        </span>
                      </td>
                      <td>
                        {merchant.createdAt
                          ? new Date(merchant.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td>
                        <button
                          className={`${styles.statusToggleBtn} ${
                            merchant.status === 'suspended' ? styles.activate : styles.suspend
                          }`}
                          onClick={() => handleToggleStatus(merchant)}
                          disabled={statusMutation.isPending}
                        >
                          {merchant.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Retailer Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Add Retailer</h2>
                <p className={styles.modalSubtitle}>Onboard a new retailer to your territory</p>
              </div>
              <button className={styles.modalClose} onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateMerchant} className={styles.modalForm}>
              {formError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="storeName" className={styles.formLabel}>
                  Business Name *
                </label>
                <input
                  type="text"
                  id="storeName"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleInputChange}
                  placeholder="Enter business name"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.formLabel}>
                  Owner Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter owner's full name"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phoneNumber" className={styles.formLabel}>
                  Contact Number *
                </label>
                <div className={styles.phoneInputWrapper}>
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleInputChange}
                    className={styles.countryCodeSelect}
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+971">+971</option>
                  </select>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className={styles.formInput}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>
                  Email ID *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="planType" className={styles.formLabel}>
                  Choose Subscription
                </label>
                <select
                  id="planType"
                  name="planType"
                  value={formData.planType}
                  onChange={handleInputChange}
                  className={styles.formInput}
                >
                  <option value="">Select licence (optional)</option>
                  <option value="SMART" disabled={!inventory?.plans?.SMART?.totalRemaining}>
                    Smart Licence
                    {inventory ? ` (${inventory.plans?.SMART?.totalRemaining || 0} left)` : ''}
                  </option>
                  <option value="CORE" disabled={!inventory?.plans?.CORE?.totalRemaining}>
                    Core Licence
                    {inventory ? ` (${inventory.plans?.CORE?.totalRemaining || 0} left)` : ''}
                  </option>
                </select>
                <p className={styles.formHint}>
                  Assigns a license from your purchased inventory and activates it immediately.
                  Leave blank to add the retailer without a plan.
                </p>
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

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Activating...' : 'Activate Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend/Activate Confirmation Modal */}
      {statusTarget && (
        <div className={styles.modalOverlay} onClick={handleCancelStatusChange}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.confirmIcon} ${
                statusTarget.status === 'suspended' ? styles.confirmIconGreen : ''
              }`}
            >
              <ShieldAlert size={32} />
            </div>
            <h2 className={styles.confirmTitle}>
              {statusTarget.status === 'suspended' ? 'Activate Retailer?' : 'Suspend Retailer?'}
            </h2>
            <p className={styles.confirmMessage}>
              {statusTarget.status === 'suspended' ? (
                <>
                  <strong>{statusTarget.profile?.storeName || statusTarget.name}</strong> will regain access and be able to log in again.
                </>
              ) : (
                <>
                  <strong>{statusTarget.profile?.storeName || statusTarget.name}</strong> will lose access immediately and won&apos;t be able to log in until reactivated.
                </>
              )}
            </p>
            <div className={styles.confirmFooter}>
              <button className={styles.confirmCancelBtn} onClick={handleCancelStatusChange}>
                Cancel
              </button>
              <button
                className={`${styles.confirmActionBtn} ${
                  statusTarget.status === 'suspended' ? styles.confirmActivateBtn : styles.confirmSuspendBtn
                }`}
                onClick={handleConfirmStatusChange}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending
                  ? 'Please wait...'
                  : statusTarget.status === 'suspended'
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
