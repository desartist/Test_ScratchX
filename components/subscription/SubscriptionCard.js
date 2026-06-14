'use client';

import React, { useState, useEffect } from 'react';
import styles from './SubscriptionCard.module.css';
import { AlertCircle, ChevronRight, TrendingUp } from 'lucide-react';

/**
 * Subscription Card Component
 *
 * Displays merchant's subscription status, quota usage, and alerts
 * Shows on merchant dashboard
 */
export default function SubscriptionCard() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch subscription details on mount
  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription/usage', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to load subscription');
        return;
      }

      setSubscription(result.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Error loading subscription details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className={styles.card} style={{
        border: '2px solid #ef9e1b',
        background: 'linear-gradient(135deg, #fffbf5 0%, #ffffff 100%)',
      }}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            fontSize: '40px',
            marginBottom: '12px',
          }}>
            🚀
          </div>
          <h3 className={styles.title} style={{ marginBottom: '8px' }}>
            Ready to Get Started?
          </h3>
          <p style={{
            fontSize: '13px',
            color: '#666',
            margin: '0 0 16px 0',
            lineHeight: '1.5'
          }}>
            Choose a plan to unlock powerful features and grow your business with ScratchX.
          </p>
          <a
            href="/billing/upgrade"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #ef9e1b, #ff9500)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 158, 27, 0.3)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 158, 27, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(239, 158, 27, 0.3)';
            }}
          >
            View Plans & Pricing
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Subscription</h3>
          <p className={styles.subtitle}>{subscription.plan.displayName}</p>
        </div>
        <span className={`${styles.badge} ${styles[subscription.subscription.status]}`}>
          {subscription.subscription.status.toUpperCase()}
        </span>
      </div>

      {/* Plan & Days Remaining */}
      <div className={styles.planInfo}>
        <div className={styles.infoItem}>
          <span className={styles.label}>Current Plan</span>
          <span className={styles.value}>{subscription.plan.name}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.label}>Days Remaining</span>
          <span className={styles.value}>
            {subscription.daysRemaining > 0 ? subscription.daysRemaining : 'Expired'}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {subscription.alerts && subscription.alerts.length > 0 && (
        <div className={styles.alerts}>
          {subscription.alerts.slice(0, 3).map((alert, idx) => (
            <div
              key={idx}
              className={`${styles.alert} ${styles[`alert${alert.type}`]}`}
            >
              <AlertCircle size={16} />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quota Usage */}
      <div className={styles.quotaSection}>
        <h4 className={styles.quotaTitle}>Usage Overview</h4>

        {subscription.percentageUsed &&
          Object.entries(subscription.percentageUsed)
            .slice(0, 4)
            .map(([label, data]) => (
              <div key={label} className={styles.quotaItem}>
                <div className={styles.quotaLabel}>
                  <span>{label}</span>
                  <span className={styles.quotaValue}>
                    {data.unlimited
                      ? '∞'
                      : `${data.current}/${data.limit}`}
                  </span>
                </div>
                {!data.unlimited && (
                  <div className={styles.progressBar}>
                    <div
                      className={`${styles.progress} ${
                        data.percentage >= 95
                          ? styles.critical
                          : data.percentage >= 80
                          ? styles.warning
                          : styles.ok
                      }`}
                      style={{
                        width: `${Math.min(data.percentage, 100)}%`,
                      }}
                    />
                  </div>
                )}
                <span
                  className={`${styles.percentage} ${
                    data.percentage >= 80 ? styles.warning : ''
                  }`}
                >
                  {data.percentage}%
                </span>
              </div>
            ))}
      </div>

      {/* Trial Ending Warning */}
      {subscription.subscription.status === 'trial' &&
        subscription.daysRemaining <= 3 && (
          <div className={styles.trialWarning}>
            <TrendingUp size={16} />
            <span>
              Trial expires in {subscription.daysRemaining} day
              {subscription.daysRemaining !== 1 ? 's' : ''}.
              <a href="/billing/upgrade"> Upgrade now</a>
            </span>
          </div>
        )}

      {/* Footer */}
      <a href="/subscription" className={styles.viewDetails}>
        View Full Details
        <ChevronRight size={16} />
      </a>
    </div>
  );
}
