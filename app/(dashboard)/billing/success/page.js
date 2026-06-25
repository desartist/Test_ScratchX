'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/components/subscription/SubscriptionContext';
import styles from './success.module.css';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePlan } = useSubscription();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const plan = searchParams.get('plan') || 'Starter';
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    const initializeSuccess = async () => {
      try {
        // Update global subscription state (reloads from server and updates context)
        await updatePlan();
      } catch (err) {
        console.error('Error updating plan:', err);
      }

      // Simulate fetching payment details
      setTimeout(() => {
        setPaymentDetails({
          paymentId,
          plan,
          status: 'completed',
          amount: 499,
          currency: 'INR',
          transactionId: `TXN-${Date.now()}`,
        });
        setLoading(false);
      }, 1000);
    };

    initializeSuccess();
  }, [paymentId, plan, updatePlan]);

  const handleDashboard = () => {
    router.push('/dashboard');
  };

  const handleViewSubscription = () => {
    router.push('/subscription');
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
      <div className={styles.successCard}>
        {/* Success Icon */}
        <div className={styles.iconContainer}>
          <CheckCircle size={80} className={styles.successIcon} />
        </div>

        {/* Main Message */}
        <h1 className={styles.title}>Payment Successful!</h1>
        <p className={styles.subtitle}>
          Your subscription has been activated and you can start using ScratchX immediately.
        </p>

        {/* Details */}
        <div className={styles.detailsBox}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Plan</span>
            <span className={styles.value}>{plan} Plan</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Amount Paid</span>
            <span className={styles.value}>₹{paymentDetails.amount}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Transaction ID</span>
            <span className={styles.value}>{paymentDetails.transactionId}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Status</span>
            <span className={`${styles.value} ${styles.success}`}>
              ✓ {paymentDetails.status.charAt(0).toUpperCase() + paymentDetails.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div className={styles.nextStepsBox}>
          <h3>What's Next?</h3>
          <ul>
            <li>✓ Your subscription is now active</li>
            <li>✓ All features are unlocked</li>
            <li>✓ Check your email for confirmation</li>
            <li>✓ Start creating campaigns immediately</li>
          </ul>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleDashboard}>
            Go to Dashboard
            <ArrowRight size={16} />
          </button>
          <button className={styles.secondaryBtn} onClick={handleViewSubscription}>
            View Subscription Details
          </button>
        </div>

        {/* Support Info */}
        <div className={styles.supportBox}>
          <p>
            Need help? Contact our support team at{' '}
            <a href="mailto:support@scratchx.com">support@scratchx.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
