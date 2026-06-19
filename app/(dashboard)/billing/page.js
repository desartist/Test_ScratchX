"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./billing.module.css";
import { CheckCircle, AlertCircle } from "lucide-react";

const CHECK = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CROSS = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        <span>Unlimited scratch cards / month</span>
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

export default function BillingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/subscription/plans");
        const data = await res.json();

        if (data.success && data.data) {
          setPlans(data.data);
        } else {
          setError("Could not load plans");
        }
      } catch (err) {
        console.error("[BillingPage] Error fetching plans:", err);
        setError("Failed to load subscription plans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <p>Loading plans...</p>
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Choose Your ScratchX Plan</h1>
          <p className={styles.subtitle}>One-time purchase • Lifetime access • Unlimited campaigns & scratches</p>
          <p className={styles.gstNote}>All prices exclude 18% GST</p>
        </div>

        {/* Plans Grid */}
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`${styles.planCard} ${plan.recommended ? styles.planCardPopular : ""}`}
            >
              {plan.recommended && <span className={styles.popularBadge}>RECOMMENDED</span>}

              {/* Plan Header */}
              <div className={styles.planHeader}>
                <h2 className={styles.planName}>{plan.displayName}</h2>
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
                <h3 className={styles.featuresTitle}>Includes:</h3>
                <FeatureList features={plan.features} limits={plan.limits} />
              </div>

              {/* CTA Button */}
              <button
                onClick={() => router.push(`/billing/checkout?planId=${plan._id}&planName=${plan.name}`)}
                className={`${styles.ctaButton} ${plan.recommended ? styles.ctaButtonPrimary : styles.ctaButtonSecondary}`}
              >
                {plan.recommended ? "Start with Smart" : "Get Core"}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className={styles.faqSection}>
          <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h4>Is this a lifetime plan?</h4>
              <p>Yes! Once purchased, your plan is yours for lifetime. No renewal required.</p>
            </div>
            <div className={styles.faqItem}>
              <h4>Can I upgrade from Core to Smart?</h4>
              <p>Yes! Upgrade anytime to get access to multi-store features. You'll pay the full Smart plan price.</p>
            </div>
            <div className={styles.faqItem}>
              <h4>Can I add extra stores in Smart plan?</h4>
              <p>Yes! Smart plan includes 5 stores. Additional stores cost ₹199 each (one-time).</p>
            </div>
            <div className={styles.faqItem}>
              <h4>Are scratches really unlimited?</h4>
              <p>Yes! Create as many scratches as you want, forever. Included in your lifetime plan.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
