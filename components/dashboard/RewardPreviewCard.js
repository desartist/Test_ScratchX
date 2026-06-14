'use client';
import React from 'react';
import styles from './RewardPreviewCard.module.css';

export default function RewardPreviewCard({
  minAmount,
  maxAmount,
  rewards = [],
  campaignName = 'ScratchX',
}) {
  /**
   * Format the reward value for display
   * - Single reward: show value with symbol (%, ₹, or text)
   * - Multiple rewards: show count
   * - None: show '?'
   */
  const getDisplayValue = () => {
    if (!rewards || rewards.length === 0) {
      return '?';
    }

    if (rewards.length === 1) {
      const reward = rewards[0];
      const value = reward.value || '0';

      switch (reward.type) {
        case 'Percentage':
          return `${value}%`;
        case 'Fixed Amount':
          return `₹${value}`;
        default:
          return value;
      }
    }

    // Multiple rewards: show count
    return `${rewards.length}`;
  };

  /**
   * Get human-readable reward description
   * - Single: "X% cashback" or "₹X credit"
   * - Multiple: "Up to N rewards"
   */
  const getRewardText = () => {
    if (!rewards || rewards.length === 0) {
      return 'No reward configured';
    }

    if (rewards.length === 1) {
      const reward = rewards[0];
      const value = reward.value || '0';

      switch (reward.type) {
        case 'Percentage':
          return `${value}% cashback`;
        case 'Fixed Amount':
          return `₹${value} credit`;
        default:
          return `${value}`;
      }
    }

    return `Up to ${rewards.length} rewards`;
  };

  // Check if we have valid amount range
  const hasValidRange = minAmount !== '' && minAmount !== undefined && maxAmount !== '' && maxAmount !== undefined;

  // Get unique reward types
  const rewardTypes = [...new Set(rewards.map((r) => r.type))].join(', ');

  return (
    <div className={styles.container}>
      <p className={styles.label}>Reward Preview</p>

      {hasValidRange ? (
        <div className={styles.previewSection}>
          <div className={styles.scratchCard}>
            <div className={styles.scratchCardContent}>
              <p className={styles.brand}>{campaignName}</p>
              <p className={styles.rewardLabel}>Your Reward</p>
              <p className={styles.rewardValue}>{getDisplayValue()}</p>
              <p className={styles.hintText}>Scratch to reveal</p>
              <p className={styles.spendingRange}>
                Spend ₹{minAmount} - ₹{maxAmount}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0' }}>
            {getRewardText()}
          </p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📋</div>
          <p className={styles.emptyStateText}>
            Set spending range to preview the reward card
          </p>
        </div>
      )}

      <div className={styles.detailsSection}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Spending Range</span>
          <span className={styles.detailValue}>
            {hasValidRange ? `₹${minAmount} - ₹${maxAmount}` : 'Not set'}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Reward Options</span>
          <span className={styles.detailValue}>
            {rewards.length > 0 ? `${rewards.length} configured` : 'None'}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Reward Types</span>
          <span className={styles.detailValue}>
            {rewardTypes || 'Not specified'}
          </span>
        </div>
      </div>
    </div>
  );
}
