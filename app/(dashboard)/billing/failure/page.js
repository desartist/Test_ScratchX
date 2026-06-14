'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import styles from './failure.module.css';

export default function PaymentFailurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failureDetails, setFailureDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const plan = searchParams.get('plan') || 'Starter';
  const reason = searchParams.get('reason') || 'Payment declined by bank';

  useEffect(() => {
    // Simulate fetching failure details
    setTimeout(() => {
      setFailureDetails({
        plan,
        reason,
        timestamp: new Date().toLocaleString(),
        transactionId: `TXN-${Date.now()}`,
      });
      setLoading(false);
    }, 1000);
  }, [plan, reason]);

  const handleRetry = () => {
    router.push('/billing/upgrade');
  };

  const handleDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.failureCard}>
        {/* Failure Icon */}
        <div className={styles.iconContainer}>
          <AlertCircle size={80} className={styles.failureIcon} />
        </div>

        {/* Main Message */}
        <h1 className={styles.title}>Payment Failed</h1>
        <p className={styles.subtitle}>
          Unfortunately, your payment could not be processed. Please try again or contact support.
        </p>

        {/* Failure Reason */}
        <div className={styles.reasonBox}>
          <h3>Reason</h3>
          <p className={styles.reason}>{failureDetails.reason}</p>
        </div>

        {/* Details */}
        <div className={styles.detailsBox}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Plan</span>
            <span className={styles.value}>{failureDetails.plan} Plan</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Transaction ID</span>
            <span className={styles.value}>{failureDetails.transactionId}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Timestamp</span>
            <span className={styles.value}>{failureDetails.timestamp}</span>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className={styles.troubleshootBox}>
          <h3>Why This Happened?</h3>
          <ul>
            <li>Insufficient funds in your account</li>
            <li>Card was declined by your bank</li>
            <li>Incorrect card details provided</li>
            <li>Expired or invalid card</li>
            <li>Temporary network issue</li>
          </ul>
          <p className={styles.tip}>
            💡 <strong>Tip:</strong> Contact your bank to confirm your card is valid and enabled for online payments.
          </p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleRetry}>
            Retry Payment
            <ArrowRight size={16} />
          </button>
          <button className={styles.secondaryBtn} onClick={handleDashboard}>
            Back to Dashboard
          </button>
        </div>

        {/* Support Info */}
        <div className={styles.supportBox}>
          <p>
            Having trouble? Contact our support team at{' '}
            <a href="mailto:support@scratchx.com">support@scratchx.com</a> or call{' '}
            <a href="tel:+919999999999">+91 9999 999 999</a>
          </p>
        </div>
      </div>
    </div>
  );
}
