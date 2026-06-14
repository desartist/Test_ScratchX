'use client';
import React, { useState, useEffect } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import styles from './DeleteCampaignModal.module.css';

export default function DeleteCampaignModal({
  isOpen,
  onClose,
  campaignName,
  storeCount,
  onConfirm,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // isMounted ref to guard async state updates
  const isMountedRef = React.useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onConfirm();
      if (isMountedRef.current) {
        onClose();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to delete campaign');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Campaign">
      <div className={styles.modalContent}>
        {/* Header with danger icon */}
        <div className={styles.header}>
          <Trash2 className={styles.dangerIcon} size={32} aria-hidden="true" />
        </div>

        {campaignName && (
          <p className={styles.campaignName}>{campaignName}</p>
        )}

        <p className={styles.message}>
          This campaign will be permanently deleted. This action cannot be undone.
        </p>

        {storeCount > 0 && (
          <div className={styles.warningBox}>
            <AlertCircle size={18} />
            <span>
              {storeCount} store allocation(s) will also be removed.
            </span>
          </div>
        )}

        {error && (
          <div className={styles.errorBox} role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`${styles.confirmBtn} ${styles.dangerBtn}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Campaign'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
