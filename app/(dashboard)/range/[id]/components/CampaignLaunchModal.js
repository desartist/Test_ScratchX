'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import styles from './CampaignLaunchModal.module.css';

export default function CampaignLaunchModal({
  isOpen,
  onClose,
  validationErrors,
  isLoading,
  error,
  onConfirm,
  campaignName,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setLocalError(null);
    }
  }, [isOpen]);

  const hasErrors = validationErrors && validationErrors.length > 0;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setLocalError(null);
      await onConfirm();
    } catch (err) {
      setLocalError(err.message || 'Failed to launch campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className={styles.footer}>
      <button
        className={styles.cancelBtn}
        onClick={onClose}
        disabled={isSubmitting}
        type="button"
      >
        Cancel
      </button>
      <button
        className={styles.confirmBtn}
        onClick={handleConfirm}
        disabled={isSubmitting || hasErrors}
        type="button"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className={styles.spinner} />
            Launching...
          </>
        ) : (
          'Generate QR & Launch'
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Launch Campaign & Generate QR Code"
      onClose={onClose}
      footer={footer}
    >
      <div className={styles.content}>
        {/* Campaign Info */}
        {campaignName && (
          <div className={styles.campaignInfo}>
            <p className={styles.label}>Campaign</p>
            <p className={styles.campaignName}>{campaignName}</p>
          </div>
        )}

        {/* Validation Errors */}
        {hasErrors && (
          <div className={styles.errorContainer}>
            <div className={styles.errorHeader}>
              <AlertCircle size={20} />
              <h3>Campaign Launch Requirements</h3>
            </div>
            <ul className={styles.errorList}>
              {validationErrors.map((error, index) => (
                <li key={index} className={styles.errorItem}>
                  <span className={styles.errorIcon}>✕</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success State */}
        {!hasErrors && (
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>
              <CheckCircle size={32} />
            </div>
            <h3 className={styles.successTitle}>Ready to Launch</h3>
            <p className={styles.successText}>
              All requirements are met. Click "Generate QR & Launch" to proceed.
            </p>

            {/* Summary */}
            <div className={styles.summary}>
              <p className={styles.summaryLabel}>This will:</p>
              <ul className={styles.summaryList}>
                <li>Generate a QR code for your campaign</li>
                <li>Set campaign status to "Active"</li>
                <li>Make the campaign available to assigned stores</li>
              </ul>
            </div>
          </div>
        )}

        {/* Server Error */}
        {(error || localError) && (
          <div className={styles.serverError}>
            <AlertCircle size={18} />
            <p>{error || localError}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
