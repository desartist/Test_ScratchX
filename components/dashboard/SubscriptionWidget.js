'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './SubscriptionWidget.module.css'

/**
 * SubscriptionWidget Component
 *
 * Displays subscription status, plan information, and entitlement details on dashboard.
 * Shows plan name, platform access, unlimited scratches status, remaining days,
 * and action buttons for plan management.
 */
export default function SubscriptionWidget() {
  const router = useRouter()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch subscription status on mount
  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to load subscription status')
        return
      }

      setStatus(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching subscription status:', err)
      setError('Error loading subscription details')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.widget}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonContent} />
        <div className={styles.skeletonContent} />
        <div className={styles.skeletonBar} />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.widget}>
        <div className={styles.errorContainer}>
          <h3 className={styles.errorTitle}>Unable to Load Subscription</h3>
          <p className={styles.errorMessage}>{error}</p>
          <button
            onClick={fetchSubscriptionStatus}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // No active plan state
  if (!status.hasActivePlan) {
    return (
      <div className={styles.widget}>
        <div className={styles.noPlanContainer}>
          <div className={styles.noPlanIcon}>🎯</div>
          <h3 className={styles.noPlanTitle}>No Active Plan</h3>
          <p className={styles.noPlanMessage}>
            Get started with a subscription plan to unlock unlimited features and grow your business.
          </p>
          <button
            onClick={() => router.push('/subscription')}
            className={styles.viewPlansButton}
          >
            View Plans
          </button>
        </div>
      </div>
    )
  }

  // Calculate progress percentage for remaining days
  const progressPercentage = status.unlimitedScratches
    ? Math.min((status.remainingDays / 365) * 100, 100)
    : 0

  // Format date display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className={styles.widget}>
      {/* Header with plan name and badge */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.planName}>{status.plan}</h3>
          <span className={styles.badge}>{status.platformAccess}</span>
        </div>
      </div>

      {/* Plan info cards */}
      <div className={styles.planInfoGrid}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Current Plan</span>
          <span className={styles.infoValue}>{status.plan}</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Platform Access</span>
          <div className={styles.infoValueWithCheckmark}>
            <span>✓</span>
            <span>{status.platformAccess}</span>
          </div>
        </div>
      </div>

      {/* Entitlement section */}
      <div className={styles.entitlementSection}>
        <h4 className={styles.entitlementTitle}>Unlimited Scratches</h4>

        {status.unlimitedScratches ? (
          <>
            <div className={styles.statusBadge + ' ' + styles.activeBadge}>
              ACTIVE
            </div>

            {/* Remaining days info */}
            <div className={styles.daysInfo}>
              <div className={styles.daysRemaining}>
                <span className={styles.daysLabel}>Remaining Days</span>
                <span className={styles.daysValue}>{status.remainingDays}</span>
              </div>
              <div className={styles.expiryDate}>
                <span className={styles.dateLabel}>Expiry Date</span>
                <span className={styles.dateValue}>
                  {formatDate(status.unlimitedScratchesExpiryDate)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className={styles.progressLabel}>{progressPercentage.toFixed(0)}% Complete</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.statusBadge + ' ' + styles.expiredBadge}>
              EXPIRED
            </div>

            {/* Purchased scratches info */}
            {status.scratchPurchased > 0 && (
              <div className={styles.scratchInfo}>
                <span className={styles.scratchLabel}>Purchased Scratches</span>
                <span className={styles.scratchValue}>
                  {status.scratchRemaining === 'UNLIMITED' ? '∞' : status.scratchRemaining} / {status.scratchPurchased}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          onClick={() => router.push('/subscription')}
          className={styles.managePlanButton}
        >
          Manage Plan
        </button>

        {!status.unlimitedScratches && (
          <button
            onClick={() => router.push('/subscription')}
            className={styles.purchaseScratchesButton}
          >
            Purchase Scratches
          </button>
        )}
      </div>
    </div>
  )
}
