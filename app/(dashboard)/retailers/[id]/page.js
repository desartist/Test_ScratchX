'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Package,
} from 'lucide-react';
import styles from '../retailers.module.css';

export default function RetailerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const retailerId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retailer, setRetailer] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRetailer();
  }, [retailerId]);

  const fetchRetailer = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/distributor/retailers/${retailerId}`, {
        credentials: 'include',
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch retailer');
      }

      setRetailer(json.data.retailer || json.data);
    } catch (err) {
      console.error('[RetailerDetails] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this retailer? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const res = await fetch(`/api/distributor/retailers/${retailerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to delete retailer');
      }

      router.push('/dashboard/retailers');
    } catch (err) {
      console.error('[RetailerDetails] Delete Error:', err);
      setError(err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading retailer details...</p>
        </div>
      </div>
    );
  }

  if (error || !retailer) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button
              onClick={() => router.back()}
              className={styles.backButton}
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className={styles.headerContent}>
              <h1>Retailer Details</h1>
            </div>
          </div>

          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error || 'Retailer not found'}</p>
            <button onClick={fetchRetailer} className={styles.retryButton}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => router.back()}
                className={styles.backButton}
                title="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1>{retailer.storeName}</h1>
                <p>{retailer.city}, {retailer.state}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => router.push(`/dashboard/retailers/${retailerId}/edit`)}
              className={styles.primaryButton}
              style={{ textDecoration: 'none' }}
            >
              <Edit2 size={16} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '12px 24px',
                background: '#fef2f2',
                color: '#ef4444',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: deleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              <Trash2 size={16} style={{ display: 'inline', marginRight: '8px' }} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={styles.alertBox}>
            <AlertCircle size={20} />
            <div>
              <p className={styles.alertTitle}>Error</p>
              <p className={styles.alertMessage}>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className={styles.closeAlert}
            >
              ×
            </button>
          </div>
        )}

        {/* Info Cards */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>
              <Package size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Active Plans</p>
              <p className={styles.metricValue}>{retailer.activePlans || 0}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Sales</p>
              <p className={styles.metricValue}>₹{(retailer.totalSales || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-purple']}`}>
            <div className={styles.metricIcon}>💰</div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Commission Earned</p>
              <p className={styles.metricValue}>₹{(retailer.commissionEarned || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-orange']}`}>
            <div className={styles.metricIcon}>👥</div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Status</p>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: retailer.status === 'active' ? '#10b981' : '#f59e0b',
                }}
              >
                {retailer.status ? retailer.status.charAt(0).toUpperCase() + retailer.status.slice(1) : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              {['overview', 'contact', 'plans', 'commission'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 0',
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: activeTab === tab ? '#3b82f6' : '#9ca3af',
                    cursor: 'pointer',
                    borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                    marginBottom: '-2px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>
                Store Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                    Business Type
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#010f44' }}>
                    {retailer.businessType ? retailer.businessType.charAt(0).toUpperCase() + retailer.businessType.slice(1) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                    Joined Date
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#010f44' }}>
                    {retailer.createdAt
                      ? new Date(retailer.createdAt).toLocaleDateString('en-IN')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                    Owner Name
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#010f44' }}>
                    {retailer.ownerName || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: '700' }}>
                Contact Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail size={20} color="#3b82f6" />
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                      Email
                    </p>
                    <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#010f44' }}>
                      {retailer.email || 'N/A'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Phone size={20} color="#3b82f6" />
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                      Phone
                    </p>
                    <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#010f44' }}>
                      {retailer.phone || 'N/A'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MapPin size={20} color="#3b82f6" />
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                      Address
                    </p>
                    <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#010f44' }}>
                      {retailer.address}, {retailer.city}, {retailer.state} {retailer.pincode}
                    </p>
                  </div>
                </div>
                {retailer.contactPersonName && (
                  <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                      Contact Person
                    </p>
                    <p style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#010f44' }}>
                      {retailer.contactPersonName}
                    </p>
                    {retailer.contactPersonPhone && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                        {retailer.contactPersonPhone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>
                Subscription Plans
              </h3>
              {retailer.plans && retailer.plans.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {retailer.plans.map((plan, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        borderLeft: '4px solid #3b82f6',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#010f44' }}>
                            {plan.planName || plan.planType}
                          </p>
                          <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
                            Assigned: {plan.assignedCount || 0}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#010f44' }}>
                            ₹{(plan.totalValue || 0).toLocaleString()}
                          </p>
                          <p
                            style={{
                              margin: '0',
                              fontSize: '12px',
                              color:
                                plan.status === 'active' ? '#10b981' : plan.status === 'pending'
                                  ? '#f59e0b'
                                  : '#9ca3af',
                            }}
                          >
                            {plan.status ? plan.status.charAt(0).toUpperCase() + plan.status.slice(1) : 'Active'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px 0' }}>
                  No plans assigned yet
                </p>
              )}
            </div>
          )}

          {/* Commission Tab */}
          {activeTab === 'commission' && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: '700' }}>
                Commission Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                    Commission Rate
                  </p>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#010f44' }}>
                    {retailer.commissionRate || 0}%
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                    Total Earned
                  </p>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                    ₹{(retailer.commissionEarned || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                    Pending
                  </p>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
                    ₹{(retailer.commissionPending || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                    Paid Out
                  </p>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: '700', color: '#6b7280' }}>
                    ₹{(retailer.commissionPaid || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
