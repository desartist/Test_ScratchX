'use client';

import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Ban,
  Plus,
  Search,
  X,
  AlertCircle,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useAdminDistributorsQuery,
  useCreateDistributorMutation,
  useUpdateDistributorStatusMutation,
} from '@/hooks/queries/useAdminDistributorsQuery';
import styles from './distributors.module.css';

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

function getInitials(name) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function DistributorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const { data, isPending: loading, error: queryError, refetch } = useAdminDistributorsQuery({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const distributors = data?.distributors || [];
  const metrics = data?.metrics || { total: 0, active: 0, suspended: 0 };
  const error = queryError ? queryError.message : null;

  const createMutation = useCreateDistributorMutation();
  const statusMutation = useUpdateDistributorStatusMutation();

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

  const handleToggleStatus = (distributor) => {
    setStatusTarget(distributor);
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
            <h1>Distributors</h1>
            <p>Onboard and manage your distributor network</p>
          </div>
          <button className={styles.primaryButton} onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Add Distributor
          </button>
        </div>

        {/* Metrics */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>
              <Users size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Distributors</p>
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

          <div className={`${styles.metricCard} ${styles['metric-red']}`}>
            <div className={styles.metricIcon}>
              <Ban size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Suspended</p>
              <p className={styles.metricValue}>{metrics.suspended}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterTabs}>
            {['all', 'active', 'suspended'].map((tab) => (
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
            <p>Loading distributors...</p>
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
                  <th>Distributor</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Territory</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {distributors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyState}>
                      <Users size={32} />
                      <p>No distributors found</p>
                      <button className={styles.createLink} onClick={() => setShowModal(true)}>
                        Add your first distributor
                      </button>
                    </td>
                  </tr>
                ) : (
                  distributors.map((distributor) => (
                    <tr key={distributor._id}>
                      <td>
                        <div className={styles.distributorInfo}>
                          <div className={styles.avatar}>{getInitials(distributor.name)}</div>
                          <div>
                            <p className={styles.name}>{distributor.name}</p>
                            <p className={styles.email}>{distributor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>{distributor.phone || '—'}</td>
                      <td>{distributor.profile?.companyName || '—'}</td>
                      <td>{distributor.profile?.territory || '—'}</td>
                      <td>
                        {distributor.profile?.commissionRate != null
                          ? `${distributor.profile.commissionRate}%`
                          : 'Default (0%)'}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${styles[`badge-${distributor.status || 'pending'}`]}`}
                        >
                          {distributor.status === 'active' ? '✓' : '●'}{' '}
                          {distributor.status?.charAt(0).toUpperCase() + distributor.status?.slice(1)}
                        </span>
                      </td>
                      <td>
                        {distributor.createdAt
                          ? new Date(distributor.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td>
                        <button
                          className={`${styles.statusToggleBtn} ${
                            distributor.status === 'suspended' ? styles.activate : styles.suspend
                          }`}
                          onClick={() => handleToggleStatus(distributor)}
                          disabled={statusMutation.isPending}
                        >
                          {distributor.status === 'suspended' ? 'Activate' : 'Suspend'}
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
              {statusTarget.status === 'suspended' ? 'Activate Distributor?' : 'Suspend Distributor?'}
            </h2>
            <p className={styles.confirmMessage}>
              {statusTarget.status === 'suspended' ? (
                <>
                  <strong>{statusTarget.name}</strong> will regain access and be able to log in again.
                </>
              ) : (
                <>
                  <strong>{statusTarget.name}</strong> will lose access immediately and won&apos;t be able to log in until reactivated.
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
