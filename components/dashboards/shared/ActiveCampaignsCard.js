'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './ActiveCampaignsCard.module.css';

export default function ActiveCampaignsCard() {
  const { account } = useAuthContext();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/campaigns', {
          headers: {
            'x-user-id': account?.id || '',
            'x-user-role': account?.role || 'merchant',
            'x-user-email': account?.email || '',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch campaigns');
        const result = await response.json();

        // Filter only active campaigns and limit to 3 for dashboard
        const activeCampaigns = (result.data || [])
          .filter((campaign) => {
            const now = new Date();
            const startDate = new Date(campaign.startDate);
            const endDate = new Date(campaign.endDate);
            return now >= startDate && now <= endDate;
          })
          .slice(0, 3);

        setCampaigns(activeCampaigns);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching campaigns:', err);
      } finally {
        setLoading(false);
      }
    };

    if (account?.id) {
      fetchCampaigns();
    }
  }, [account]);

  const getDaysRemaining = (endDate) => {
    const now = new Date();
    const endDateObj = new Date(endDate);
    const daysLeft = Math.ceil((endDateObj - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Active Campaigns</h3>
        </div>
        <div className={styles.loading}>Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Active Campaigns</h3>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Active Campaigns ({campaigns.length})</h3>
        <Link href="/campaign" className={styles.viewAll}>
          View all {'>'}
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No active campaigns at the moment</p>
          <Link href="/campaign/new" className={styles.createBtn}>+ Create Campaign</Link>
        </div>
      ) : (
        <div className={styles.campaignsGrid}>
          {campaigns.map((campaign) => {
            const daysRemaining = getDaysRemaining(campaign.endDate);

            // Use campaign-level allocation data (from API)
            const totalAllocated = campaign.allocated_scratch_cards || campaign.scratchCardsLimit || 0;
            const totalUsed = campaign.scratchCardsUsed || 0;
            const totalRemaining = campaign.remaining_scratch_cards || (totalAllocated - totalUsed) || 0;
            const percentage = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

            // Determine status based on remaining scratches
            const statusBadge = totalRemaining < 500 ? 'LOW_STOCK' : 'PERFORMING';

            return (
              <div key={campaign._id} className={styles.campaignCard}>
                {/* Header */}
                <div className={styles.campaignHeader}>
                  <div className={styles.campaignInfo}>
                    <h4 className={styles.campaignName}>{campaign.campaignName}</h4>
                    <div className={styles.campaignMeta}>
                      <span className={styles.stores}>🏪 {campaign.storeCount || 0} Store{campaign.storeCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className={`${styles.statusBadge} ${styles[statusBadge.toLowerCase()]}`}>
                    {statusBadge === 'LOW_STOCK' ? '⚠️ LOW' : '✓ OK'}
                  </div>
                </div>

                {/* Time remaining */}
                <div className={styles.timeSection}>
                  <div className={styles.timeItem}>
                    <span className={styles.timeLabel}>Days Left</span>
                    <span className={styles.timeValue}>{daysRemaining}</span>
                  </div>
                  <div className={styles.timeItem}>
                    <span className={styles.timeLabel}>Scratches</span>
                    <span className={styles.timeValue}>{totalRemaining.toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Scratch Allocation</span>
                    <span className={styles.progressValue}>
                      {percentage}% <span className={styles.usedCount}>Used</span>
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 5 && (
                        <span className={styles.progressLabel}>{percentage}%</span>
                      )}
                    </div>
                    <span className={styles.progressText}>
                      {percentage > 0 && percentage < 95 ? `${totalAllocated - totalRemaining} used` : ''}
                    </span>
                  </div>
                  <div className={styles.allocationDetails}>
                    <span className={styles.allocDetail}>
                      📊 {totalUsed.toLocaleString()} Used
                    </span>
                    <span className={styles.allocDetail}>
                      ✓ {totalRemaining.toLocaleString()} Remaining
                    </span>
                    <span className={styles.allocDetail}>
                      📦 {totalAllocated.toLocaleString()} Total
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <Link href={`/campaign/${campaign._id}`} className={styles.viewBtn}>
                  View Details →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
