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
  Phone,
  Mail,
  Hash,
  Pencil,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useStoreDetailQuery, useInvalidateStoreDetail } from '@/hooks/queries/useStoreDetailQuery';
import StoreDeleteModal from '@/components/stores/StoreDeleteModal';
import AssignCampaignsModal from './components/AssignCampaignsModal';
import AssignedCampaignsList from './components/AssignedCampaignsList';
import styles from './page.module.css';

const STATUS_VARIANT = { active: 'active', inactive: 'inactive', suspended: 'suspended' };

export default function StoreDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();
  const id = params.id;

  const {
    data: storeJson,
    isPending: loading,
    error: queryError,
  } = useStoreDetailQuery(id);
  const store = storeJson?.data || null;
  const error = queryError ? queryError.message || 'Failed to load store' : null;
  const invalidateStoreDetail = useInvalidateStoreDetail();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showAssignCampaignsModal, setShowAssignCampaignsModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [successDetails, setSuccessDetails] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);

  // Reverse-geocode the store's coordinates once loaded (display-only, not
  // part of the shared query cache since it's a one-off external lookup).
  useEffect(() => {
    const { latitude, longitude } = store || {};
    if (!latitude || !longitude) return;
    let cancelled = false;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    )
      .then((res) => res.json())
      .then((geoData) => {
        if (cancelled) return;
        const a = geoData.address || {};
        setLocationInfo({
          landmark: a.amenity || a.shop || a.tourism || a.building || a.road || a.suburb || null,
          area: a.suburb || a.neighbourhood || a.village || a.town || null,
          city: a.city || a.town || a.village || a.county || null,
          state: a.state || null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [store]);

  const handleDelete = useCallback(async () => {
    try {
      setDeleteLoading(true);
      if (!account?.id) { setDeleteError('No account information available'); setShowDeleteModal(false); setDeleteLoading(false); return; }
      const res = await fetch(`/api/stores/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': account.id, 'x-user-role': account.role },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete store');
      }
      invalidateStoreDetail(id);
      router.push('/stores');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete store');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  }, [id, account, router, invalidateStoreDetail]);

  const handleCampaignsAssigned = useCallback((data) => {
    setShowAssignCampaignsModal(false);
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      setSuccessDetails({ assignedCount: data.assignedCount || 0, skippedCount: data.skippedCount || 0 });
      setSuccessMessage(data.message || 'Campaigns assigned successfully');
      setTimeout(() => { setSuccessMessage(null); setSuccessDetails(null); }, 5000);
    }
    invalidateStoreDetail(id);
  }, [invalidateStoreDetail, id]);

  if (loading) return <div className={styles.container}><div className={styles.loadingContainer}>Loading store details…</div></div>;
  if (error) return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => router.back()}><ChevronLeft size={20} /></button>
      <div className={styles.errorContainer}>{error}</div>
    </div>
  );
  if (!store) return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => router.back()}><ChevronLeft size={20} /></button>
      <div className={styles.emptyState}>Store not found</div>
    </div>
  );

  const isMainStore = !!store.is_main_store;

  const statusKey = store.status || 'active';
  const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
  const statusClass = styles[`statusBadge${statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}`] || styles.statusBadgeActive;

  const initials = (store.contact_person || '')
    .split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const campaigns = store.assignedCampaigns || store.storeSnapshots || store.assigned_campaigns || [];
  const assignedCampaignIds = campaigns.map((c) => String(c._id)).filter(Boolean);

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
                  {successDetails.assignedCount > 0 && `${successDetails.assignedCount} campaign${successDetails.assignedCount !== 1 ? 's' : ''} assigned`}
                  {successDetails.assignedCount > 0 && successDetails.skippedCount > 0 && ' · '}
                  {successDetails.skippedCount > 0 && `${successDetails.skippedCount} already assigned`}
                </p>
              )}
            </div>
          </div>
          <button className={styles.successClose} onClick={() => { setSuccessMessage(null); setSuccessDetails(null); }}>×</button>
        </div>
      )}

      {/* Page Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()} title="Go back">
          <ChevronLeft size={20} />
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{store.store_name}</h1>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewTop}>
          <div className={styles.storeMeta}>
            <h2 className={styles.overviewName}>{store.store_name}</h2>
            <p className={styles.overviewLocation}>
              <MapPin size={14} />
              {store.city}, {store.state}
            </p>
            {isMainStore && (
              <span className={styles.mainStoreBadge}>⭐ Main Store</span>
            )}
          </div>
          <span className={statusClass}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {statusLabel}
          </span>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statTile}>
            <div className={styles.statIcon}><Megaphone size={16} /></div>
            <p className={styles.statValue}>{store.active_campaigns || 0}</p>
            <span className={styles.statLabel}>Active Campaigns</span>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statIcon}><ScanLine size={16} /></div>
            <p className={styles.statValue}>{store.total_scans || 0}</p>
            <span className={styles.statLabel}>Total Scans</span>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statIcon}><TrendingUp size={16} /></div>
            <p className={styles.statValue}>{store.conversions || 0}</p>
            <span className={styles.statLabel}>Conversions</span>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statIcon}><Users size={16} /></div>
            <p className={styles.statValue}>{store.total_customers || 0}</p>
            <span className={styles.statLabel}>Customers</span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.layout}>

        {/* ── Left: Main ── */}
        <div className={styles.main}>

          {/* Store Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><Store size={14} /></span>
              Store Details
            </h2>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Store Name</span>
                <p className={styles.detailValue}>{store.store_name}</p>
              </div>
              {store.store_code && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Store Code</span>
                  <p className={styles.detailValue}>{store.store_code}</p>
                </div>
              )}
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Address</span>
                <p className={styles.detailValue}>{store.address}</p>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>City</span>
                <p className={styles.detailValue}>{store.city}</p>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>State</span>
                <p className={styles.detailValue}>{store.state}</p>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Pincode</span>
                <p className={styles.detailValue}>{store.pincode}</p>
              </div>
            </div>
          </div>

          {/* Assigned Campaigns */}
          <AssignedCampaignsList
            campaigns={campaigns}
            storeId={id}
            onCampaignRemoved={() => invalidateStoreDetail(id)}
          />

        </div>

        {/* ── Right: Sidebar ── */}
        <div className={styles.sidebar}>

          {/* Manager Info */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><User size={14} /></span>
              Manager Info
            </h2>
            <div className={styles.managerChip}>
              <div className={styles.managerAvatar}>{initials}</div>
              <div>
                <div className={styles.managerName}>{store.contact_person || 'N/A'}</div>
                <div className={styles.managerRole}>Store Manager</div>
              </div>
            </div>
            <div className={styles.detailGroup}>
              <div className={styles.detailRow}>
                <span className={styles.detailRowLabel}>Phone</span>
                <span className={styles.detailRowValue}>{store.contact_number || 'N/A'}</span>
              </div>
              {store.email && (
                <div className={styles.detailRow}>
                  <span className={styles.detailRowLabel}>Email</span>
                  <span className={styles.detailRowValue}>{store.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Nearest Location */}
          {store.latitude && store.longitude && (
            <div className={styles.sidebarCard}>
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

          {/* Actions */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><Pencil size={14} /></span>
              Actions
            </h2>
            <div className={styles.actionGroup}>
              <button onClick={() => setShowAssignCampaignsModal(true)} className={styles.assignButton}>
                <PlusCircle size={16} /> Assign Campaigns
              </button>
              <button onClick={() => router.push(`/stores/${id}/edit`)} className={styles.editButton}>
                <Pencil size={16} /> Edit Store
              </button>
              <div className={isMainStore ? styles.deleteWrapper : undefined} title={isMainStore ? 'Main store cannot be deleted' : undefined}>
                <button
                  onClick={() => !isMainStore && setShowDeleteModal(true)}
                  className={`${styles.deleteButton} ${isMainStore ? styles.deleteButtonDisabled : ''}`}
                  disabled={isMainStore}
                >
                  <Trash2 size={15} />
                  {isMainStore ? 'Main Store — Cannot Delete' : 'Delete Store'}
                </button>
              </div>
              {deleteError && <p className={styles.detailLabel} style={{ color: '#c0392b' }}>{deleteError}</p>}
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      <AssignCampaignsModal
        isOpen={showAssignCampaignsModal}
        onClose={() => setShowAssignCampaignsModal(false)}
        storeId={id}
        userId={account?.id}
        userRole={account?.role}
        assignedCampaignIds={assignedCampaignIds}
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
