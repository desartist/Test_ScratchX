'use client';
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Modal from '@/components/common/Modal';
import styles from './ConfirmStatusModal.module.css';

export default function ConfirmStatusModal({
  isOpen,
  onClose,
  action,
  campaignName,
  onConfirm,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fix 1: Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // Fix 6: isMounted ref to guard async state updates
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
        setError(err.message || 'Failed to update campaign status');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const getModalContent = () => {
    switch (action?.toLowerCase()) {
      case 'activate':
        return {
          title: 'Activate Campaign',
          message: 'This campaign will become live and available for assigned stores.',
          buttonText: 'Activate',
          isDanger: false,
        };
      case 'pause':
        return {
          title: 'Pause Campaign',
          message: 'Customers will temporarily stop receiving rewards from this campaign.',
          buttonText: 'Pause',
          isDanger: false,
        };
      case 'resume':
        return {
          title: 'Resume Campaign',
          message: 'This campaign will become active again.',
          buttonText: 'Resume',
          isDanger: false,
        };
      case 'end':
        return {
          title: 'End Campaign',
          message: 'This action cannot be undone. The campaign will be permanently closed.',
          buttonText: 'End Campaign',
          isDanger: true,
        };
      default:
        return {
          title: 'Confirm Action',
          message: 'Are you sure?',
          buttonText: 'Confirm',
          isDanger: false,
        };
    }
  };

  // Fix 6: Guard moved to top, before getModalContent()
  if (!isOpen) return null;

  const content = getModalContent();

  return (
    // Fix 2: Pass title prop to Modal for aria-labelledby
    <Modal isOpen={isOpen} onClose={onClose} title={content.title}>
      <div className={styles.modalContent}>
        {/* Fix 3: Keep icon but remove duplicate h2; icon marked aria-hidden */}
        <div className={styles.header}>
          {content.isDanger ? (
            <AlertCircle className={styles.dangerIcon} size={32} aria-hidden="true" />
          ) : (
            <CheckCircle className={styles.infoIcon} size={32} aria-hidden="true" />
          )}
        </div>

        {campaignName && (
          <p className={styles.campaignName}>{campaignName}</p>
        )}

        <p className={styles.message}>{content.message}</p>

        {error && (
          // Fix 4: role="alert" so screen readers announce the error
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
            className={`${styles.confirmBtn} ${content.isDanger ? styles.dangerBtn : ''}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : content.buttonText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
