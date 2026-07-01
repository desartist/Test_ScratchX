'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Calendar, DollarSign } from 'lucide-react';
import styles from './AssignCampaignsModal.module.css';

export default function AssignCampaignsModal({
  isOpen,
  onClose,
  storeId,
  userId,
  userRole,
  onCampaignsAssigned
}) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [assignedCampaignIds, setAssignedCampaignIds] = useState([]);

  // Fetch available campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-user-id': userId,
          'x-user-role': userRole || 'Merchant',
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        setCampaigns(Array.isArray(data.data) ? data.data : []);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Fetch store's currently assigned campaigns
  const fetchAssignedCampaigns = useCallback(async () => {
    if (!userId || !storeId) return;

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        headers: {
          'x-user-id': userId,
          'x-user-role': userRole || 'Merchant',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const assigned = (data.data?.assignedCampaigns || [])
          .map(c => c.campaignId._id ? c.campaignId._id.toString() : c.campaignId.toString())
          .filter(id => id);
        setAssignedCampaignIds(assigned);
      }
    } catch (err) {
      console.error('Failed to fetch assigned campaigns:', err);
    }
  }, [userId, storeId, userRole]);

  // Load campaigns when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
      fetchAssignedCampaigns();
      setSelectedCampaigns([]);
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen, fetchCampaigns, fetchAssignedCampaigns]);

  // Filter campaigns based on search
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.campaignName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle campaign selection
  const handleCampaignToggle = (campaignId) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  // Handle assign campaigns
  const handleAssignCampaigns = async () => {
    if (selectedCampaigns.length === 0) {
      setError('Please select at least one campaign');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/stores/${storeId}/assign-campaigns`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': userRole || 'Merchant',
        },
        body: JSON.stringify({
          campaignIds: selectedCampaigns
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign campaigns');
      }

      const result = await response.json();
      if (result.success) {
        onCampaignsAssigned({
          assignedCount: result.assignedCount || selectedCampaigns.length,
          skippedCount: result.skippedCount || 0,
          message: result.message || 'Campaigns assigned successfully'
        });
        onClose();
      } else {
        setError(result.message || 'Failed to assign campaigns');
      }
    } catch (err) {
      console.error('Failed to assign campaigns:', err);
      setError(err.message || 'Failed to assign campaigns');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateRange = (campaign) => {
    if (!campaign.startDate || !campaign.endDate) return null;
    const start = new Date(campaign.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const end = new Date(campaign.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${start} - ${end}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Assign Campaigns to Store</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            disabled={submitting}
          />
        </div>

        {/* Error message */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Campaign list */}
        <div className={styles.campaignList}>
          {loading ? (
            <div className={styles.loadingMessage}>Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className={styles.emptyMessage}>
              {campaigns.length === 0 ? 'No campaigns available' : 'No campaigns match your search'}
            </div>
          ) : (
            filteredCampaigns.map(campaign => {
              const isAlreadyAssigned = assignedCampaignIds.includes(campaign._id.toString());
              const dateRange = formatDateRange(campaign);
              const campaignStatus = campaign.status || 'draft';

              return (
                <label
                  key={campaign._id}
                  className={`${styles.campaignItem} ${isAlreadyAssigned ? styles.disabled : ''}`}
                  title={isAlreadyAssigned ? 'This campaign is already assigned to this store' : ''}
                >
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign._id)}
                    onChange={() => !isAlreadyAssigned && handleCampaignToggle(campaign._id)}
                    disabled={submitting || isAlreadyAssigned}
                    className={styles.checkbox}
                  />
                  <div className={styles.campaignInfo}>
                    <span className={styles.campaignName}>
                      {campaign.name || campaign.campaignName}
                    </span>
                    <div className={styles.statusRow}>
                      {isAlreadyAssigned ? (
                        <span className={`${styles.status} ${styles.statusAssigned}`}>
                          Already Assigned
                        </span>
                      ) : (
                        <>
                          <span className={`${styles.status} ${styles[`status${campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1)}`]}`}>
                            {campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1)}
                          </span>
                          {dateRange && (
                            <span style={{ fontSize: '12px', color: '#b0b8c0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} />
                              {dateRange}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className={styles.assignButton}
            onClick={handleAssignCampaigns}
            disabled={submitting || selectedCampaigns.length === 0}
          >
            {submitting ? 'Assigning...' : `Assign (${selectedCampaigns.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
