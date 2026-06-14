'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import styles from './cancel.module.css';

export default function CancelSubscriptionPage() {
  const router = useRouter();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchCancellationDetails();
  }, []);

  const fetchCancellationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription/cancel', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        setDetails(result.data);
      }
    } catch (err) {
      console.error('Error fetching cancellation details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmed) {
      alert('Please confirm that you want to cancel your subscription');
      return;
    }

    try {
      setCancelling(true);
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason || 'Not provided' }),
      });

      const result = await response.json();
      if (result.success) {
        setCompleted(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        alert(result.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      alert('Error cancelling subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (completed) {
    return (
      <div className={styles.container}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Subscription Cancelled</h1>
          <p className={styles.message}>
            Your subscription has been successfully cancelled. Your campaigns will be inactive.
          </p>
          <p className={styles.submessage}>
            Redirecting to dashboard in 3 seconds...
          </p>
          <button
            className={styles.primaryBtn}
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <ChevronLeft size={20} />
        </button>
        <h1 className={styles.title}>Cancel Subscription</h1>
      </div>

      <div className={styles.content}>
        {/* Warning Box */}
        <div className={styles.warningBox}>
          <AlertCircle size={24} />
          <div>
            <h3>⚠️ We'll miss you!</h3>
            <p>
              Before you go, please note that cancelling your subscription will immediately
              deactivate all your campaigns and QR codes.
            </p>
          </div>
        </div>

        {/* Subscription Details */}
        {details?.subscription && (
          <div className={styles.detailsCard}>
            <h3 className={styles.cardTitle}>Current Subscription</h3>
            <div className={styles.detailsGrid}>
              <div className={styles.detail}>
                <span className={styles.label}>Plan</span>
                <span className={styles.value}>{details.subscription.planName}</span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>Status</span>
                <span className={styles.value}>
                  {details.subscription.status.charAt(0).toUpperCase() +
                    details.subscription.status.slice(1)}
                </span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>Billing Cycle</span>
                <span className={styles.value}>
                  {details.subscription.billingCycle.charAt(0).toUpperCase() +
                    details.subscription.billingCycle.slice(1)}
                </span>
              </div>
              <div className={styles.detail}>
                <span className={styles.label}>Current Period Ends</span>
                <span className={styles.value}>
                  {new Date(details.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Usage Summary */}
        {details?.usage && (
          <div className={styles.usageCard}>
            <h3 className={styles.cardTitle}>You Will Lose Access To:</h3>
            <div className={styles.usageGrid}>
              <div className={styles.usageItem}>
                <span className={styles.usageLabel}>Active Campaigns</span>
                <span className={styles.usageValue}>{details.usage.campaigns}</span>
              </div>
              <div className={styles.usageItem}>
                <span className={styles.usageLabel}>Stores</span>
                <span className={styles.usageValue}>{details.usage.stores}</span>
              </div>
              <div className={styles.usageItem}>
                <span className={styles.usageLabel}>Scratches</span>
                <span className={styles.usageValue}>{details.usage.scratchCards}</span>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {details?.cancellationWarnings && (
          <div className={styles.warningsCard}>
            <h3 className={styles.cardTitle}>What Happens After Cancellation?</h3>
            <ul className={styles.warningsList}>
              {details.cancellationWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Reason */}
        <div className={styles.reasonCard}>
          <h3 className={styles.cardTitle}>Tell Us Why (Optional)</h3>
          <textarea
            className={styles.textarea}
            placeholder="Your feedback helps us improve..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows="4"
          />
        </div>

        {/* Confirmation */}
        <div className={styles.confirmationBox}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              I understand that my subscription will be cancelled and my campaigns will be
              inactive. I confirm that I want to cancel my subscription.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={handleCancel}
            disabled={!confirmed || cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Subscription'}
          </button>
          <button
            className={styles.keepBtn}
            onClick={() => router.back()}
            disabled={cancelling}
          >
            Keep Subscription
          </button>
        </div>

        {/* Support CTA */}
        <div className={styles.supportBox}>
          <p>
            Having issues with your plan?{' '}
            <a href="mailto:support@scratchx.com">Contact our support team</a> - we might be
            able to help!
          </p>
        </div>
      </div>
    </div>
  );
}
