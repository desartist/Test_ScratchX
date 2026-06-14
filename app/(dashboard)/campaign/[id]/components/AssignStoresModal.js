'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import styles from './AssignStoresModal.module.css';

export default function AssignStoresModal({
  isOpen,
  onClose,
  campaignId,
  userId,
  userRole,
  onStoresAssigned
}) {
  const [stores, setStores] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch available stores
  const fetchStores = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stores', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-user-id': userId,
          'x-user-role': userRole || 'Merchant',
        },
      });

      const data = await response.json();

      if (data.success && data.data) {

        setStores(Array.isArray(data.data) ? data.data : []);
      } else {
        setStores([]);
      }
    } catch (err) {
      console.error('Failed to fetch stores:', err);
      setError('Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Load stores when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStores();
      setSelectedStores([]);
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen, fetchStores]);

  // Filter stores based on search
  const filteredStores = stores.filter(store =>
    store.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.store_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle store selection
  const handleStoreToggle = (storeId) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  // Handle assign stores
  const handleAssignStores = async () => {
    if (selectedStores.length === 0) {
      setError('Please select at least one store');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': userRole || 'Merchant',
        },
        body: JSON.stringify({
          storeIds: selectedStores
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign stores');
      }

      const result = await response.json();
      if (result.success) {
        // Pass assignment results to parent for success toast
        onStoresAssigned({
          assignedCount: result.assignedCount || selectedStores.length,
          skippedCount: result.skippedCount || 0,
          message: result.message || 'Stores assigned successfully'
        });
        // Close modal immediately on success
        onClose();
      } else {
        // Only show error if the API actually failed
        setError(result.message || 'Failed to assign stores');
      }
    } catch (err) {
      console.error('Failed to assign stores:', err);
      setError(err.message || 'Failed to assign stores');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Assign Stores to Campaign</h2>
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
            placeholder="Search stores by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            disabled={submitting}
          />
        </div>

        {/* Error message */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Store list */}
        <div className={styles.storeList}>
          {loading ? (
            <div className={styles.loadingMessage}>Loading stores...</div>
          ) : filteredStores.length === 0 ? (
            <div className={styles.emptyMessage}>
              {stores.length === 0 ? 'No stores available' : 'No stores match your search'}
            </div>
          ) : (
            filteredStores.map(store => (
              <label key={store._id} className={styles.storeItem}>
                <input
                  type="checkbox"
                  checked={selectedStores.includes(store._id)}
                  onChange={() => handleStoreToggle(store._id)}
                  disabled={submitting}
                  className={styles.checkbox}
                />
                <div className={styles.storeInfo}>
                  <span className={styles.storeName}>{store.store_name}</span>
                  {store.city && (
                    <span className={styles.storeCode}>{store.city}</span>
                  )}
                </div>
              </label>
            ))
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
            onClick={handleAssignStores}
            disabled={submitting || selectedStores.length === 0}
          >
            {submitting ? 'Assigning...' : `Assign (${selectedStores.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
