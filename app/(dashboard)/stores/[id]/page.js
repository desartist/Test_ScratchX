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
  const [locationInfo, setLocationInfo] = useState(null);

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

        // Reverse geocode coordinates → landmark
        const { latitude, longitude } = result.data || {};
        if (latitude && longitude) {
          try {
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const geoData = await geo.json();
            const a = geoData.address || {};
            const landmark = a.amenity || a.shop || a.tourism || a.building || a.road || a.pedestrian || a.suburb || null;
            const area = a.suburb || a.neighbourhood || a.village || a.town || null;
            const city = a.city || a.town || a.village || a.county || null;
            setLocationInfo({ landmark, area, city, state: a.state || null });
          } catch { /* silently skip */ }
        }
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

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatsCard value={store.active_campaigns || 0} label="Active Campaigns" icon={<Megaphone size={20} />} />
        <StatsCard value={store.total_scans || 0} label="Total Scans" icon={<ScanLine size={20} />} />
        <StatsCard value={store.conversions || 0} label="Conversions" icon={<TrendingUp size={20} />} />
        <StatsCard value={store.total_customers || 0} label="Customers" icon={<Users size={20} />} />
      </div>

      {/* Info Card */}
      <div className={styles.infoCard}>

        {/* Store Details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><Store size={14} /></span>
            Store Details
          </h2>
          <div className={styles.detailGroup}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Store Name</span>
              <span className={styles.detailValue}>{store.store_name}</span>
            </div>
            {store.store_code && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Store Code</span>
                <span className={styles.detailValue}>{store.store_code}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Address</span>
              <span className={styles.detailValue}>{store.address}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>City</span>
              <span className={styles.detailValue}>{store.city}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>State</span>
              <span className={styles.detailValue}>{store.state}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Pincode</span>
              <span className={styles.detailValue}>{store.pincode}</span>
            </div>
          </div>
        </div>

        {/* Manager Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><User size={14} /></span>
            Manager Info
          </h2>
          <div className={styles.managerChip}>
            <span className={styles.managerAvatar}>
              {(store.contact_person || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
            </span>
            <div>
              <div className={styles.managerName}>{store.contact_person || 'N/A'}</div>
              <div className={styles.managerRole}>Store Manager</div>
            </div>
          </div>
          <div className={styles.detailGroup}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}>{store.contact_number || 'N/A'}</span>
            </div>
            {store.email && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{store.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Nearest Location */}
        {store.latitude && store.longitude && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><MapPin size={14} /></span>
              Nearest Location
            </h2>
            <div className={styles.locationChip}>
              <div className={styles.locationPinDot} />
              <div className={styles.locationChipText}>
                {locationInfo?.landmark && (
                  <div className={styles.locationChipMain}>{locationInfo.landmark}</div>
                )}
                <div className={styles.locationChipSub}>
                  {locationInfo
                    ? [locationInfo.area, locationInfo.city, locationInfo.state].filter(Boolean).join(', ')
                    : `${store.city}, ${store.state}`}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Campaigns */}
      <AssignedCampaignsList
        campaigns={store.assignedCampaigns || store.storeSnapshots || store.assigned_campaigns || []}
        storeId={id}
        onCampaignRemoved={refreshStore}
      />

      {/* Action Footer */}
      <div className={styles.actionFooter}>
        <button onClick={() => router.push(`/stores/${id}/edit`)} className={styles.editButton}>
          Edit Store
        </button>
        <button onClick={() => setShowAssignCampaignsModal(true)} className={styles.assignButton}>
          + Assign Campaigns
        </button>
        <button onClick={() => setShowDeleteModal(true)} className={styles.deleteButton}>
          Delete Store
        </button>
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
