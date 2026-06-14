'use client';

import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import styles from './RemoveStoreModal.module.css';

export default function RemoveStoreModal({
  isOpen,
  onClose,
  store,
  campaignId,
  userId,
  userRole,
  onRemoveConfirmed,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirmRemove = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const storeId = store?.storeId || store?._id;
      if (!storeId) {
        throw new Error('Store ID is missing');
      }

      const response = await fetch(
        `/api/campaigns/${campaignId}/stores/${storeId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'x-user-id': userId,
            'x-user-role': userRole || 'Merchant',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to remove store');
      }

      onRemoveConfirmed(storeId);
      onClose();
    } catch (err) {
      console.error('Failed to remove store:', err);
      setError(err.message || 'Failed to remove store');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !store) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="Close modal"
        >
          <X size={20} />
        </button>

        {/* Alert Icon */}
        <div className={styles.iconContainer}>
          <AlertCircle size={48} className={styles.alertIcon} />
        </div>

        {/* Title */}
        <h2 className={styles.title}>Remove Store from Campaign?</h2>

        {/* Message */}
        <p className={styles.message}>
          Are you sure you want to remove <strong>{store.storeName || store.name}</strong> from this campaign?
          This action will be marked as removed and cannot be undone. The store data will remain in the audit trail.
        </p>

        {/* Error */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Buttons */}
        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={submitting}
          >
            Keep Store
          </button>
          <button
            className={styles.removeButton}
            onClick={handleConfirmRemove}
            disabled={submitting}
          >
            {submitting ? 'Removing...' : 'Remove Store'}
          </button>
        </div>
      </div>
    </div>
  );
}
