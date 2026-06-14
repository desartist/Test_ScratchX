'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft,
  MapPin,
  Megaphone,
  ScanLine,
  TrendingUp,
  Users,
  Store,
  User,
} from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthContext';
import Badge from '@/components/dashboard/Badge';
import StatsCard from '@/components/stores/StatsCard';
import StoreDeleteModal from '@/components/stores/StoreDeleteModal';
import AssignCampaignsModal from './components/AssignCampaignsModal';
import AssignedCampaignsList from './components/AssignedCampaignsList';
import styles from './page.module.css';

// Map store status → Badge variant.
const STATUS_VARIANT = {
  active: 'success',
  inactive: 'danger',
  suspended: 'warning',
};

export default function StoreDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();
  const id = params.id;

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAssignCampaignsModal, setShowAssignCampaignsModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [successDetails, setSuccessDetails] = useState(null);

  // Silent refresh of store data (used after assign/remove). Does not toggle
  // the page-level loading state so the layout stays put.
  const refreshStore = useCallback(async () => {
    if (!id || !account?.id) return;
    try {
      const response = await fetch(`/api/stores/${id}`, {
        headers: {
          'x-user-id': account.id,
          'x-user-role': account.role
        }
      });
      if (response.ok) {
        const result = await response.json();
        setStore(result.data);
      }
    } catch (err) {
      console.error('Failed to refresh store:', err);
    }
  }, [id, account]);

  // Initial fetch (with loading + error states).
  useEffect(() => {
    const fetchStore = async () => {
      try {
        setLoading(true);

        if (!account || !account.id) {
          setError('No account information available');
          setStore(null);
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/stores/${id}`, {
          headers: {
            'x-user-id': account.id,
            'x-user-role': account.role
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load store');
        }

        const result = await response.json();
        setStore(result.data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load store');
        setStore(null);
      } finally {
        setLoading(false);
      }
    };

    if (id && account) {
      fetchStore();
    }
  }, [id, account]);

  // Delete store
  const handleDelete = useCallback(async () => {
    try {
      setDeleteLoading(true);

      if (!account || !account.id) {
        setError('No account information available');
        setShowDeleteModal(false);
        setDeleteLoading(false);
        return;
      }

      const response = await fetch(`/api/stores/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': account.id,
          'x-user-role': account.role
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete store');
      }

      router.push('/stores');
    } catch (err) {
      setError(err.message || 'Failed to delete store');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  }, [id, account, router]);

  // Handle campaigns assigned
  const handleCampaignsAssigned = useCallback(
    (data) => {
      setShowAssignCampaignsModal(false);

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setSuccessDetails({
          assignedCount: data.assignedCount || 0,
          skippedCount: data.skippedCount || 0
        });
        setSuccessMessage(data.message || 'Campaigns assigned successfully');

        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
          setSuccessDetails(null);
        }, 5000);
      }

      // Refresh store details
      refreshStore();
    },
    [refreshStore]
  );

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>Loading store details...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <ChevronLeft size={20} />
        </button>
        <div className={styles.errorContainer}>{error}</div>
      </div>
    );
  }

  // Not found state
  if (!store) {
    return (
      <div className={styles.container}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <ChevronLeft size={20} />
        </button>
        <div className={styles.emptyState}>Store not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Success Notification */}
      {successMessage && (
        <div className={styles.successNotification}>
          <div className={styles.successContent}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successText}>
              <p className={styles.successTitle}>Campaigns assigned successfully</p>
              {successDetails && (
                <p className={styles.successDescription}>
                  {successDetails.assignedCount > 0 && (
                    <>
                      {successDetails.assignedCount} campaign{successDetails.assignedCount !== 1 ? 's' : ''} assigned
                    </>
                  )}
                  {successDetails.assignedCount > 0 && successDetails.skippedCount > 0 && ' • '}
                  {successDetails.skippedCount > 0 && (
                    <>
                      {successDetails.skippedCount} already assigned
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <button
            className={styles.successClose}
            onClick={() => {
              setSuccessMessage(null);
              setSuccessDetails(null);
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          title="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>{store.store_name}</h1>
            <p className={styles.location}>
              <MapPin size={16} />
              {store.city}, {store.state}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Badge
              label={
                store.status
                  ? store.status.charAt(0).toUpperCase() + store.status.slice(1)
                  : 'Active'
              }
              variant={STATUS_VARIANT[store.status] || 'default'}
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className={styles.contentLayout}>
        {/* Left Column - Store Info Card */}
        <div className={styles.leftColumn}>
          <div className={styles.infoCard}>
            {/* Store Details Section */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>
                  <Store size={15} />
                </span>
                Store Details
              </h2>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <div className={styles.label}>Store Name</div>
                  <div className={styles.value}>{store.store_name}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.label}>Store Code</div>
                  <div className={styles.value}>{store.store_code || 'N/A'}</div>
                </div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.label}>Address</div>
                <div className={styles.value}>{store.address}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <div className={styles.label}>City</div>
                  <div className={styles.value}>{store.city}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.label}>State</div>
                  <div className={styles.value}>{store.state}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.label}>Pincode</div>
                  <div className={styles.value}>{store.pincode}</div>
                </div>
              </div>
            </div>

            {/* Manager Info Section */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>
                  <User size={15} />
                </span>
                Manager Info
              </h2>
              <div className={styles.managerChip}>
                <span className={styles.managerAvatar}>
                  {(store.contact_person || '')
                    .split(' ')
                    .filter(Boolean)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || '?'}
                </span>
                <div>
                  <div className={styles.managerName}>
                    {store.contact_person || 'N/A'}
                  </div>
                  <div className={styles.managerRole}>Store Manager</div>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <div className={styles.label}>Phone</div>
                  <div className={styles.value}>
                    {store.contact_number || 'N/A'}
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.label}>Email</div>
                  <div className={styles.value}>{store.email || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Coordinates Section */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>
                  <MapPin size={15} />
                </span>
                Coordinates
              </h2>
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <div className={styles.label}>Latitude</div>
                  <div className={`${styles.value} ${styles.readOnly}`}>{store.latitude || 'N/A'}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.label}>Longitude</div>
                  <div className={`${styles.value} ${styles.readOnly}`}>{store.longitude || 'N/A'}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column - Stats Grid */}
        <div className={styles.rightColumn}>
          <div className={styles.statsGrid}>
            <StatsCard
              value={store.active_campaigns || 0}
              label="Active Campaigns"
              icon={<Megaphone size={20} />}
            />
            <StatsCard
              value={store.total_scans || 0}
              label="Total Scans"
              icon={<ScanLine size={20} />}
            />
            <StatsCard
              value={store.conversions || 0}
              label="Conversions"
              icon={<TrendingUp size={20} />}
            />
            <StatsCard
              value={store.total_customers || 0}
              label="Customers"
              icon={<Users size={20} />}
            />
          </div>
        </div>
      </div>

      {/* Campaigns Assigned to This Store */}
      <div className={styles.section}>
        <AssignedCampaignsList
          campaigns={store.assignedCampaigns || store.storeSnapshots || store.assigned_campaigns || []}
          storeId={id}
          onCampaignRemoved={refreshStore}
        />
      </div>

      {/* Action Buttons Footer */}
      <div className={styles.actionFooter}>
        <div className={styles.actionButtons}>
          <button
            onClick={() => router.push(`/stores/${id}/edit`)}
            className={styles.editButton}
          >
            Edit Store
          </button>
          <button
            onClick={() => setShowAssignCampaignsModal(true)}
            className={styles.assignButton}
          >
            + Assign Campaigns
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className={styles.deleteButton}
          >
            Delete Store
          </button>
        </div>
      </div>

      {/* Modals */}
      <AssignCampaignsModal
        isOpen={showAssignCampaignsModal}
        onClose={() => setShowAssignCampaignsModal(false)}
        storeId={id}
        userId={account?.id}
        userRole={account?.role}
        onCampaignsAssigned={handleCampaignsAssigned}
      />

      <StoreDeleteModal
        store={store}
        isOpen={showDeleteModal}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        loading={deleteLoading}
      />
    </div>
  );
}
