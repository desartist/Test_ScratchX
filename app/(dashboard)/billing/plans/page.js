"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./plans.module.css";

const CHECK = (
  <svg className={styles.featureIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CROSS = (
  <svg className={styles.featureIconOff} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function FeatureRow({ value, label }) {
  const enabled = value === true || (typeof value === "number" && value !== 0);
  return (
    <li className={styles.featureItem}>
      {enabled ? CHECK : CROSS}
      <span>
        {typeof value === "number" && value !== 0
          ? `${value === -1 ? "Unlimited" : value} ${label}`
          : label}
      </span>
    </li>
  );
}

const POPULAR_PLAN = "Smart"; // Smart plan is the recommended plan

export default function PlansPage() {
  const router = useRouter();
  const [cycle, setCycle] = useState("monthly");
  const [plans, setPlans] = useState([]);
  const [currentPlanName, setCurrentPlanName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // ✅ Fetch plans - no auth required
        const planRes = await fetch("/api/subscription/plans");
        const planData = await planRes.json();

        console.log('[PlansPage] Plans response:', planData);

        if (planData.success && planData.data) {
          setPlans(planData.data);
        }

        // ✅ Optionally fetch current subscription if user is authenticated
        try {
          const subRes = await fetch("/api/subscription/current");
          const subData = await subRes.json();
          if (subData.success && subData.subscription) {
            setCurrentPlanName(subData.subscription.planId?.name ?? null);
          }
        } catch (err) {
          console.log('[PlansPage] No current subscription or not authenticated');
        }
      } catch (err) {
        console.error('[PlansPage] Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  function handleSelect(plan) {
    if (!plan.price?.base || plan.price.base === 0) return; // Free plan — no checkout needed
    router.push(`/billing/checkout?planId=${plan._id}&planName=${plan.name}`);
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Choose a Plan</h1>
        <p style={{ color: "var(--color-muted)", fontSize: 14 }}>Loading plans…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Choose a Plan</h1>
      <p className={styles.pageSubtitle}>
        All prices exclude 18% GST. Cancel anytime.
      </p>

      {/* ── Plan cards ── */}
      {plans.map((plan) => {
        const isCurrent = plan.name === currentPlanName;
        const isPopular = plan.name === POPULAR_PLAN;
        const basePrice = plan.price?.base || 0;
        const withGST = plan.price?.withGST || 0;
        const isFree = basePrice === 0;

        return (
          <div
            key={plan._id}
            className={`${styles.planCard} ${isCurrent ? styles.planCardActive : ""} ${isPopular && !isCurrent ? styles.planCardPopular : ""}`}
          >
            {isCurrent && <span className={styles.currentBadge}>Current Plan</span>}
            {isPopular && !isCurrent && <span className={styles.popularBadge}>Most Popular</span>}

            <div className={styles.planHeader}>
              <div>
                <p className={styles.planName}>{plan.name}</p>
                <p className={styles.planDesc}>{plan.description}</p>
              </div>
              <div className={styles.priceBlock}>
                <p className={styles.price}>
                  {isFree ? "Free" : `₹${basePrice.toLocaleString("en-IN")}`}
                </p>
                {!isFree && (
                  <p className={styles.pricePeriod}>
                    + ₹{(withGST - basePrice).toLocaleString("en-IN")} GST • One-time
                  </p>
                )}
              </div>
            </div>

            <ul className={styles.features}>
              <FeatureRow
                value={plan.limits?.maxCampaigns}
                label="Campaigns"
              />
              <FeatureRow
                value={plan.limits?.maxStores}
                label="Stores"
              />
              <FeatureRow
                value={plan.limits?.maxScratchCardsPerMonth}
                label="Scratches / month"
              />
              <FeatureRow
                value={plan.limits?.maxMonthlyScans}
                label="Scans / month"
              />
              <FeatureRow
                value={plan.limits?.maxRangesPerCampaign}
                label="Ranges per campaign"
              />
              {plan.limits?.maxManagersPerAccount > 0 && (
                <FeatureRow value={plan.limits?.maxManagersPerAccount} label="Managers" />
              )}
              <FeatureRow value={plan.features?.canViewAnalytics} label="Real-time Analytics" />
              <FeatureRow value={plan.features?.canExportReports} label="Data export" />
              <FeatureRow value={plan.features?.canUseWhatsAppIntegration} label="WhatsApp integration" />
              <FeatureRow value={plan.features?.canUseCustomBranding} label="Custom branding" />
              <FeatureRow value={plan.features?.canAccessPrioritySupport} label="Priority support" />
            </ul>

            <button
              onClick={() => handleSelect(plan)}
              className={`${styles.selectBtn} ${
                isCurrent
                  ? styles.selectBtnCurrent
                  : isFree
                  ? styles.selectBtnOutline
                  : styles.selectBtnPrimary
              }`}
              disabled={isCurrent}
            >
              {isCurrent
                ? "Current Plan"
                : isFree
                ? "Downgrade to Free"
                : `Get ${plan.name}`}
            </button>
          </div>
        );
      })}

      <p className={styles.gstNote}>
        + 18% GST will be added at checkout. Prices in Indian Rupees (INR).
      </p>
    </div>
  );
}
