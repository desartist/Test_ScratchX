'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle } from 'lucide-react';
import styles from './AllocateScratchModal.module.css';

export default function AllocateScratchModal({
  isOpen,
  onClose,
  campaignId,
  userId,
  userRole,
  currentAllocation,
  onAllocationUpdated
}) {
  const [merchantInfo, setMerchantInfo] = useState(null);
  const [allocationAmount, setAllocationAmount] = useState(currentAllocation || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch merchant's scratch info
  const fetchMerchantInfo = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/merchants/scratch-info', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'x-user-id': userId,
          'x-user-role': userRole || 'Merchant',
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        setMerchantInfo(data.data);
      } else {
        setError(data.message || 'Failed to load merchant info');
      }
    } catch (err) {
      console.error('Failed to fetch merchant info:', err);
      setError('Failed to load merchant information');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Load merchant info when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMerchantInfo();
      setAllocationAmount(currentAllocation || 0);
      setError(null);
    }
  }, [isOpen, fetchMerchantInfo, currentAllocation]);

  // Calculate available allocation
  const availableAllocation = merchantInfo
    ? merchantInfo.remaining_scratch_cards - (currentAllocation || 0)
    : 0;

  const maxAllocation = merchantInfo
    ? Math.max(0, merchantInfo.remaining_scratch_cards)
    : 0;

  // Validate allocation amount
  const isValid = allocationAmount > 0 && allocationAmount <= maxAllocation;

  const handleAllocate = async () => {
    if (!isValid) {
      setError(`Please enter an amount between 1 and ${maxAllocation}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/allocate-scratch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': userRole || 'Merchant',
        },
        body: JSON.stringify({
          allocationAmount: parseInt(allocationAmount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to allocate scratches');
      }

      const result = await response.json();
      onAllocationUpdated(result.data);
      onClose();
    } catch (err) {
      console.error('Failed to allocate scratches:', err);
      setError(err.message || 'Failed to allocate scratches');
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
          <h2 className={styles.title}>Allocate Scratches</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingMessage}>Loading merchant information...</div>
          ) : merchantInfo ? (
            <>
              {/* Merchant Info Cards */}
              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <p className={styles.infoLabel}>Total Scratches</p>
                  <p className={styles.infoValue}>{merchantInfo.total_scratch_cards.toLocaleString()}</p>
                </div>
                <div className={styles.infoCard}>
                  <p className={styles.infoLabel}>Used</p>
                  <p className={styles.infoValue}>{merchantInfo.used_scratch_cards.toLocaleString()}</p>
                </div>
                <div className={styles.infoCard}>
                  <p className={styles.infoLabel}>Remaining</p>
                  <p className={styles.infoValue + ' ' + styles.highlight}>
                    {merchantInfo.remaining_scratch_cards.toLocaleString()}
                  </p>
                </div>
                <div className={styles.infoCard}>
                  <p className={styles.infoLabel}>Currently Allocated</p>
                  <p className={styles.infoValue}>{currentAllocation?.toLocaleString() || 0}</p>
                </div>
              </div>

              {/* Allocation Input */}
              <div className={styles.allocationSection}>
                <label htmlFor="allocation" className={styles.label}>
                  Allocate Scratches to Campaign
                </label>
                <p className={styles.helperText}>
                  Available to allocate: {availableAllocation.toLocaleString()} scratches
                </p>
                <input
                  type="number"
                  id="allocation"
                  min="0"
                  max={maxAllocation}
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Enter number of scratches"
                  className={styles.input}
                  disabled={submitting || maxAllocation === 0}
                />
                {maxAllocation === 0 && (
                  <div className={styles.warningMessage}>
                    <AlertCircle size={16} />
                    No scratches available to allocate
                  </div>
                )}
              </div>

              {/* Allocation Range Slider */}
              {maxAllocation > 0 && (
                <div className={styles.sliderSection}>
                  <input
                    type="range"
                    min="0"
                    max={maxAllocation}
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(parseInt(e.target.value))}
                    className={styles.slider}
                    disabled={submitting}
                  />
                  <div className={styles.sliderLabels}>
                    <span>0</span>
                    <span>{Math.floor(maxAllocation / 2).toLocaleString()}</span>
                    <span>{maxAllocation.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Allocation Summary */}
              {allocationAmount > 0 && (
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Allocation Summary</p>
                  <div className={styles.summaryRow}>
                    <span>Scratches to Allocate:</span>
                    <span className={styles.summaryValue}>{allocationAmount.toLocaleString()}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Remaining After Allocation:</span>
                    <span className={styles.summaryValue}>
                      {(merchantInfo.remaining_scratch_cards - allocationAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.errorMessage}>
              <AlertCircle size={20} />
              Failed to load merchant information
            </div>
          )}

          {/* Error message */}
          {error && <div className={styles.errorAlert}>{error}</div>}
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
            className={styles.allocateButton}
            onClick={handleAllocate}
            disabled={submitting || !isValid || maxAllocation === 0 || loading}
          >
            {submitting ? 'Allocating...' : `Allocate ${allocationAmount.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
