"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./subscription.module.css";
import { AlertCircle } from "lucide-react";

const CHECK = (
  <svg data-type="check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color:'#22c55e',flexShrink:0}}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CROSS = (
  <svg data-type="cross" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color:'#d1d5db',flexShrink:0}}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function FeatureList({ features, limits }) {
  return (
    <ul className={styles.featuresList}>
      <li className={styles.featureItem}>
        {features.unlimitedCampaigns ? CHECK : CROSS}
        <span>Unlimited Campaigns</span>
      </li>
      <li className={styles.featureItem}>
        {features.unlimitedScratches ? CHECK : CROSS}
        <span>Unlimited scratch cards / quarter</span>
      </li>
      <li className={styles.featureItem}>
        {features.rewardManagement ? CHECK : CROSS}
        <span>Reward Management</span>
      </li>
      <li className={styles.featureItem}>
        {features.customerDatabase ? CHECK : CROSS}
        <span>Customer Database</span>
      </li>
      <li className={styles.featureItem}>
        {features.basicAnalytics ? CHECK : CROSS}
        <span>Analytics</span>
      </li>
      <li className={styles.featureItem}>
        {features.exportReports ? CHECK : CROSS}
        <span>Export Reports</span>
      </li>
      <li className={styles.featureItem}>
        {features.customBranding ? CHECK : CROSS}
        <span>Custom Branding</span>
      </li>
      <li className={styles.featureItem}>
        {features.whatsappIntegration ? CHECK : CROSS}
        <span>WhatsApp Integration</span>
      </li>
      <li className={styles.featureItem}>
        {features.fraudProtection ? CHECK : CROSS}
        <span>Fraud Protection</span>
      </li>
      <li className={styles.featureItem}>
        {features.prioritySupport ? CHECK : CROSS}
        <span>Priority Support</span>
      </li>
    </ul>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // Fetch current subscription and plans
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [subRes, plansRes, statusRes] = await Promise.all([
          fetch("/api/subscription/current"),
          fetch("/api/subscription/plans"),
          fetch("/api/subscription/status"),
        ]);

        const subData = await subRes.json();
        const plansData = await plansRes.json();
        const statusData = await statusRes.json();

        if (subData.success) {
          setSubscription(subData.subscription);
        }
        if (plansData.success) {
          setPlans(plansData.data || []);
        }
        if (statusData.success) {
          setSubscriptionStatus(statusData);
        }
        setError(null);
      } catch (err) {
        console.error("[SubscriptionPage] Error fetching data:", err);
        setError("Failed to load subscription information");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleGetPlan = (planId, planName) => {
    router.push(`/billing/checkout?planId=${planId}&planName=${planName}`);
  };

  const handlePurchaseScratch = () => {
    router.push("/billing/scratches");
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading subscription information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorAlert}>
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasActivePlan = subscriptionStatus?.hasActivePlan;
  const currentPlanName = subscriptionStatus?.plan;
  const isUnlimitedScratches = subscriptionStatus?.unlimitedScratches;
  const unlimitedScratchesExpired =
    hasActivePlan && !isUnlimitedScratches && subscriptionStatus?.scratchRemaining === 0;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Subscription & Entitlements</h1>
            <p className={styles.subtitle}>Manage your plan and unlock more features for your business</p>
          </div>
        </div>

        {/* Current Subscription Card */}
        {hasActivePlan && subscription && (
          <div className={styles.currentSubscriptionCard}>
            <div className={styles.subscriptionHeader}>
              <span className={styles.lifetimeAccessBadge}>LIFETIME ACCESS</span>
              <h2 className={styles.planNameDisplay}>{currentPlanName} Plan</h2>
            </div>

            <div className={styles.platformAccessSection}>
              <div className={styles.platformAccessItem}>
                <span className={styles.platformAccessLabel}>Platform Access:</span>
                <span className={styles.platformAccessValue}>LIFETIME</span>
                <span className={styles.checkIcon}>{CHECK}</span>
              </div>
            </div>

            {/* Entitlement Status */}
            <div className={styles.entitlementStatusSection}>
              <h3 className={styles.entitlementTitle}>Entitlement Status</h3>

              {isUnlimitedScratches ? (
                <div className={styles.entitlementItem}>
                  <span className={styles.activeBadge}>ACTIVE</span>
                  <div className={styles.entitlementDetails}>
                    <p className={styles.entitlementText}>
                      Unlimited scratch cards / quarter
                      {subscriptionStatus?.remainingDays && (
                        <span className={styles.daysRemaining}>
                          {subscriptionStatus.remainingDays} days remaining
                        </span>
                      )}
                    </p>
                    {subscriptionStatus?.unlimitedScratchesExpiryDate && (
                      <p className={styles.expiryDate}>
                        Valid until: {new Date(subscriptionStatus.unlimitedScratchesExpiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.entitlementItem}>
                  <span className={styles.expiredBadge}>EXPIRED</span>
                  <div className={styles.entitlementDetails}>
                    <p className={styles.entitlementText}>
                      Unlimited scratch cards / quarter
                      {subscriptionStatus?.scratchPurchased > 0 && (
                        <span className={styles.purchasedCount}>
                          {subscriptionStatus.scratchPurchased} purchased
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available Plans Section */}
        <div className={styles.availablePlansSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Available Plans</h2>
            <p className={styles.sectionSubtitle}>
              {hasActivePlan ? "Upgrade your subscription to access more features" : "Choose a plan to get started"}
            </p>
          </div>

          <div className={styles.plansGrid}>
            {plans.map((plan) => (
              <div
                key={plan._id}
                className={`${styles.planCard} ${
                  currentPlanName === plan.name ? styles.currentPlanCard : ""
                } ${plan.recommended ? styles.planCardPopular : ""}`}
              >
                <div className={styles.cardBadgeRow}>
                  {plan.recommended && <span className={styles.popularBadge}>RECOMMENDED</span>}
                  {currentPlanName === plan.name && (
                    <span className={styles.currentPlanBadge}>CURRENT PLAN</span>
                  )}
                </div>

                {/* Plan Header */}
                <div className={styles.planHeader}>
                  <h3 className={styles.planName}>{plan.displayName}</h3>
                  <p className={styles.planDesc}>{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className={styles.pricing}>
                  <div className={styles.priceBlock}>
                    <span className={styles.priceAmount}>
                      ₹{(plan.price?.base || 0).toLocaleString("en-IN")}
                    </span>
                    <span className={styles.pricePeriod}>one-time • lifetime access</span>
                  </div>
                  <div className={styles.gstCalculation}>
                    <span className={styles.gstLabel}>+ 18% GST:</span>
                    <span className={styles.gstAmount}>
                      ₹{((plan.price?.withGST || 0) - (plan.price?.base || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className={styles.totalPrice}>
                    <span className={styles.totalLabel}>Total:</span>
                    <span className={styles.totalAmount}>
                      ₹{(plan.price?.withGST || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Store Limits */}
                <div className={styles.limitsCard}>
                  <span className={styles.limitsLabel}>
                    📍 {plan.limits.maxStores === 1 ? "Single Store" : `Up to ${plan.limits.maxStores} Stores`}
                  </span>
                  {plan.limits.additionalStorePrice > 0 && (
                    <span className={styles.extraStoreInfo}>
                      + ₹{plan.limits.additionalStorePrice}/extra store
                    </span>
                  )}
                </div>

                {/* Features */}
                <div className={styles.features}>
                  <h4 className={styles.featuresTitle}>Includes:</h4>
                  <FeatureList features={plan.features} limits={plan.limits} />
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleGetPlan(plan._id, plan.name)}
                  disabled={currentPlanName === plan.name}
                  className={`${styles.ctaButton} ${
                    currentPlanName === plan.name
                      ? styles.ctaButtonDisabled
                      : plan.recommended
                        ? styles.ctaButtonPrimary
                        : styles.ctaButtonSecondary
                  }`}
                >
                  {currentPlanName === plan.name ? "Current Plan" : `Get ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Scratches Section */}
        {unlimitedScratchesExpired && (
          <div className={styles.scratchesSection}>
            <div className={styles.scratchesAlert}>
              <AlertCircle size={24} />
              <div className={styles.alertContent}>
                <h3 className={styles.alertTitle}>Need more scratch cards?</h3>
                <p className={styles.alertMessage}>
                  Purchase additional scratches to continue creating campaigns.
                </p>
              </div>
            </div>

            <button
              onClick={handlePurchaseScratch}
              className={styles.purchaseScratchButton}
            >
              Purchase Scratches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
