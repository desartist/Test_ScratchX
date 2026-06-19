"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  MapPin,
  CheckCircle,
  Circle,
  Zap,
  Target,
  Smartphone,
  Gift,
  ChevronRight,
} from "lucide-react";
import { ctaTracker } from "@/lib/analytics/ctaTracker";
import { abTesting } from "@/lib/analytics/abTesting";
import styles from "./PreSubscriptionDashboard.module.css";

const OnboardingHeroCard = ({ mainStore, variantContent }) => {
  const handleViewPlansClick = () => {
    ctaTracker.trackCtaClick("hero_view_plans", "hero", {
      storeName: mainStore?.store_name,
    });
  };

  const handleUpgradeClick = () => {
    ctaTracker.trackCtaClick("hero_upgrade_now", "hero", {
      storeName: mainStore?.store_name,
    });
  };

  return (
    <div className={styles.heroCard}>
      <div className={styles.heroCardContent}>
        <div className={styles.heroIcon}>🎉</div>
        <h2 className={styles.heroTitle}>{variantContent.title}</h2>
        <p className={styles.heroDescription}>{variantContent.description}</p>

        <div className={styles.storeDisplayBox}>
          <div className={styles.storeDisplayItem}>
            <span className={styles.storeDisplayLabel}>Store Name</span>
            <span className={styles.storeDisplayValue}>
              {mainStore?.store_name || "Main Store"}
            </span>
          </div>
          <div className={styles.storeDisplayItem}>
            <span className={styles.storeDisplayLabel}>Status</span>
            <span
              className={`${styles.storeDisplayValue} ${styles.statusActive}`}
            >
              ✓ Ready to Launch Campaigns
            </span>
          </div>
        </div>

        <div className={styles.heroActions}>
          <a
            href="/billing/plans"
            className={styles.primaryCta}
            onClick={handleViewPlansClick}
          >
            {variantContent.ctaPrimary}
            <ChevronRight size={18} />
          </a>
          <a
            href="/billing/upgrade"
            className={styles.secondaryCta}
            onClick={handleUpgradeClick}
          >
            {variantContent.ctaSecondary}
          </a>
        </div>
      </div>
      <div className={styles.heroDecoration}></div>
    </div>
  );
};

const MainStoreCard = ({ mainStore }) => (
  <div className={styles.mainStoreCard}>
    <div className={styles.mainStoreBadge}>
      <Sparkles size={16} />
      Main Store
    </div>

    <div className={styles.mainStoreContent}>
      <div className={styles.storeInfo}>
        <div className={styles.storeInfoRow}>
          <span className={styles.storeInfoLabel}>Store Name</span>
          <span className={styles.storeInfoValue}>{mainStore?.store_name}</span>
        </div>
        <div className={styles.storeInfoRow}>
          <span className={styles.storeInfoLabel}>Manager</span>
          <span className={styles.storeInfoValue}>
            {mainStore?.contact_person || "N/A"}
          </span>
        </div>
        <div className={styles.storeInfoRow}>
          <span className={styles.storeInfoLabel}>
            <MapPin size={14} />
            Location
          </span>
          <span className={styles.storeInfoValue}>
            {mainStore?.city}, {mainStore?.state}
          </span>
        </div>
        <div className={styles.storeInfoRow}>
          <span className={styles.storeInfoLabel}>Status</span>
          <span
            className={`${styles.storeInfoValue} ${styles.storeStatusBadge}`}
          >
            Active
          </span>
        </div>
      </div>
    </div>
  </div>
);

const StoreSummaryCard = () => (
  <div className={styles.summarySectionCard}>
    <h3 className={styles.summaryTitle}>Store Summary</h3>
    <div className={styles.summaryStats}>
      <div className={styles.summaryStatItem}>
        <span className={styles.summaryStatLabel}>Total Stores</span>
        <span className={styles.summaryStatValue}>1</span>
      </div>
      <div className={styles.summaryStatItem}>
        <span className={styles.summaryStatLabel}>Main Store</span>
        <span className={styles.summaryStatValue}>1</span>
      </div>
      <div className={styles.summaryStatItem}>
        <span className={styles.summaryStatLabel}>Branch Stores</span>
        <span className={styles.summaryStatValue}>0</span>
      </div>
    </div>
    <div className={styles.summaryUpgradeHint}>
      <p>Upgrade your plan to add more stores</p>
    </div>
  </div>
);

const PlanComparisonSection = ({
  plans,
  billingCycle,
  onBillingCycleChange,
}) => (
  <div className={styles.planComparisonSection}>
    <div className={styles.planComparisonHeader}>
      <div>
        <h2 className={styles.planComparisonTitle}>Choose Your Plan</h2>
        <p className={styles.planComparisonSubtitle}>
          Unlock unlimited campaigns and scratch rewards
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className={styles.billingToggle}>
        <button
          className={`${styles.toggleButton} ${billingCycle === "monthly" ? styles.active : ""}`}
          onClick={() => onBillingCycleChange("monthly")}
        >
          Monthly
        </button>
        <button
          className={`${styles.toggleButton} ${billingCycle === "annual" ? styles.active : ""}`}
          onClick={() => onBillingCycleChange("annual")}
        >
          Annual
          <span className={styles.saveBadge}>Save 15%</span>
        </button>
      </div>
    </div>

    <div className={styles.plansGrid}>
      {plans && plans.length > 0 ? (
        plans.map((plan) => {
          // Get pricing for selected billing cycle
          const monthlyPrice = Math.round(
            (plan.price?.monthly || 0) / 100,
          );
          const annualPrice = Math.round(
            (plan.price?.annual ||
              monthlyPrice * 12) / 100,
          );
          const displayPrice =
            billingCycle === "annual" ? annualPrice : monthlyPrice;
          const displayPeriod = billingCycle === "annual" ? "/year" : "/month";

          return (
            <div key={plan._id} className={styles.planCard}>
              <div className={styles.planCardHeader}>
                <h3 className={styles.planCardTitle}>
                  {plan.displayName || plan.name}
                </h3>
                <div className={styles.planPrice}>
                  ₹{displayPrice}
                  <span className={styles.planPriceBilling}>
                    {displayPeriod}
                  </span>
                </div>
              </div>

              <ul className={styles.planFeatures}>
                <li className={styles.planFeature}>
                  <CheckCircle size={16} />
                  <span>
                    {plan.limits.maxCampaigns === -1
                      ? "Unlimited"
                      : plan.limits.maxCampaigns}{" "}
                    Campaigns
                  </span>
                </li>
                <li className={styles.planFeature}>
                  <CheckCircle size={16} />
                  <span>
                    {plan.limits.maxStores === -1
                      ? "Unlimited"
                      : plan.limits.maxStores}{" "}
                    Stores
                  </span>
                </li>
                <li className={styles.planFeature}>
                  <CheckCircle size={16} />
                  <span>30 Days Unlimited scratch cards / month</span>
                </li>
                {plan.description && (
                  <li className={styles.planFeature}>
                    <CheckCircle size={16} />
                    <span>{plan.description}</span>
                  </li>
                )}
              </ul>

              <a
                href={`/billing/plans?plan=${plan._id}&billingCycle=${billingCycle}`}
                className={styles.planCtaButton}
                onClick={() => {
                  ctaTracker.trackCtaClick("plan_select", "plans", {
                    planId: plan._id,
                    planName: plan.displayName || plan.name,
                    billingCycle,
                  });
                }}
              >
                Select Plan
                <ChevronRight size={18} />
              </a>
            </div>
          );
        })
      ) : (
        <p className={styles.noPlansMessage}>Loading plans...</p>
      )}
    </div>
  </div>
);

const BenefitsSection = () => (
  <div className={styles.benefitsSection}>
    <h2 className={styles.benefitsTitle}>Why Choose ScratchX?</h2>

    <div className={styles.benefitsGrid}>
      <div className={styles.benefitCard}>
        <div className={styles.benefitIcon}>
          <Zap size={28} />
        </div>
        <h3 className={styles.benefitTitle}>Launch Campaigns</h3>
        <p className={styles.benefitDescription}>
          Create and manage promotional campaigns to drive customer engagement
        </p>
      </div>

      <div className={styles.benefitCard}>
        <div className={styles.benefitIcon}>
          <Target size={28} />
        </div>
        <h3 className={styles.benefitTitle}>Track Customers</h3>
        <p className={styles.benefitDescription}>
          Monitor customer participation and engagement in real-time
        </p>
      </div>

      <div className={styles.benefitCard}>
        <div className={styles.benefitIcon}>
          <Smartphone size={28} />
        </div>
        <h3 className={styles.benefitTitle}>QR Participation</h3>
        <p className={styles.benefitDescription}>
          Generate QR codes and track scans with mobile-first experience
        </p>
      </div>

      <div className={styles.benefitCard}>
        <div className={styles.benefitIcon}>
          <Gift size={28} />
        </div>
        <h3 className={styles.benefitTitle}>Distribute Rewards</h3>
        <p className={styles.benefitDescription}>
          Manage scratch rewards and deliver exciting prizes to customers
        </p>
      </div>
    </div>
  </div>
);

const GettingStartedTimeline = ({
  accountCreatedDate,
  mainStoreCreatedDate,
  isSubscriptionActive,
}) => (
  <div className={styles.timelineSection}>
    <h2 className={styles.timelineTitle}>Getting Started</h2>

    <div className={styles.timeline}>
      <div className={styles.timelineItem}>
        <div className={`${styles.timelineCheck} ${styles.completed}`}>
          <CheckCircle size={20} />
        </div>
        <div className={styles.timelineContent}>
          <h4 className={styles.timelineStep}>Account Created</h4>
          <p className={styles.timelineDate}>
            {accountCreatedDate
              ? new Date(accountCreatedDate).toLocaleDateString()
              : "Today"}
          </p>
        </div>
      </div>

      <div className={styles.timelineConnector}></div>

      <div className={styles.timelineItem}>
        <div className={`${styles.timelineCheck} ${styles.completed}`}>
          <CheckCircle size={20} />
        </div>
        <div className={styles.timelineContent}>
          <h4 className={styles.timelineStep}>Main Store Created</h4>
          <p className={styles.timelineDate}>
            {mainStoreCreatedDate
              ? new Date(mainStoreCreatedDate).toLocaleDateString()
              : "Today"}
          </p>
        </div>
      </div>

      <div className={styles.timelineConnector}></div>

      <div className={styles.timelineItem}>
        <div
          className={`${styles.timelineCheck} ${!isSubscriptionActive ? styles.pending : styles.completed}`}
        >
          {isSubscriptionActive ? (
            <CheckCircle size={20} />
          ) : (
            <Circle size={20} />
          )}
        </div>
        <div className={styles.timelineContent}>
          <h4 className={styles.timelineStep}>Subscription Activated</h4>
          <p className={styles.timelineDate}>Next step →</p>
        </div>
      </div>

      <div className={styles.timelineConnector}></div>

      <div className={styles.timelineItem}>
        <div className={`${styles.timelineCheck} ${styles.pending}`}>
          <Circle size={20} />
        </div>
        <div className={styles.timelineContent}>
          <h4 className={styles.timelineStep}>Campaign Created</h4>
          <p className={styles.timelineDate}>Coming soon</p>
        </div>
      </div>

      <div className={styles.timelineConnector}></div>

      <div className={styles.timelineItem}>
        <div className={`${styles.timelineCheck} ${styles.pending}`}>
          <Circle size={20} />
        </div>
        <div className={styles.timelineContent}>
          <h4 className={styles.timelineStep}>Campaign Launched</h4>
          <p className={styles.timelineDate}>Coming soon</p>
        </div>
      </div>
    </div>
  </div>
);

export default function PreSubscriptionDashboard({ data }) {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [variant, setVariant] = useState("heroA");

  const mainStore = data?.stores?.[0] || null;
  const account = data?.account || {};
  const variantContent = abTesting.getVariantContent(variant);

  useEffect(() => {
    // Initialize A/B test variant
    const assignedVariant = abTesting.getVariant(account._id);
    setVariant(assignedVariant);

    // Track dashboard view
    ctaTracker.trackDashboardView();

    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/subscription/plans");
        if (res.ok) {
          const json = await res.json();
          setPlans(json.data || []);
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [account._id]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Hero Section */}
        <OnboardingHeroCard
          mainStore={mainStore}
          variantContent={variantContent}
        />

        {/* Main Store Card */}
        {mainStore && <MainStoreCard mainStore={mainStore} />}

        {/* Store Summary */}
        <StoreSummaryCard />

        {/* Benefits Section */}
        <BenefitsSection />

        {/* Getting Started Timeline */}
        <GettingStartedTimeline
          accountCreatedDate={account.createdAt}
          mainStoreCreatedDate={mainStore?.createdAt}
          isSubscriptionActive={false}
        />
      </div>
    </div>
  );
}
