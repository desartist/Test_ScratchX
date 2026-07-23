'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  AlertCircle,
  Plus,
  BarChart3,
  Shield,
  ArrowRight,
  Activity,
  UserCheck,
  Zap,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSuperAdminDashboardQuery } from '@/hooks/queries/useSuperAdminDashboardQuery';
import { useCreateDistributorMutation } from '@/hooks/queries/useAdminDistributorsQuery';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin.module.css';

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

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const createMutation = useCreateDistributorMutation();

  const metrics = {
    totalDistributors: data?.roleCounts?.distributors || 0,
    totalMerchants: data?.roleCounts?.merchants || 0,
  };
  const recentUsers = data?.recentUsers || [];

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

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          {/* Total Distributors */}
          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>
              <UserCheck size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Distributors</p>
              <p className={styles.metricValue}>{metrics.totalDistributors}</p>
            </div>
          </div>

          {/* Total Merchants */}
          <div className={`${styles.metricCard} ${styles['metric-purple']}`}>
            <div className={styles.metricIcon}>
              <Activity size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Merchants</p>
              <p className={styles.metricValue}>{metrics.totalMerchants}</p>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className={styles.actionsSection}>
          <h2 className={styles.sectionTitle}>Admin Actions</h2>
          <div className={styles.actionsGrid}>
            <Link href="/distributors" className={styles.actionCard}>
              <div className={styles.actionIcon}>👥</div>
              <h3>Manage Distributors</h3>
              <p>View and manage distributor accounts</p>
              <ArrowRight size={16} />
            </Link>
            <Link href="/retailers" className={styles.actionCard}>
              <div className={styles.actionIcon}>🏢</div>
              <h3>Manage Merchants</h3>
              <p>View and manage merchant accounts</p>
              <ArrowRight size={16} />
            </Link>
          </div>
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
                      {`${user.firstName} ${user.lastName}`.trim() || user.email}
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
