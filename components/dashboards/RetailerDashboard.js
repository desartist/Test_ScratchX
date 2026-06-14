"use client";
import React from "react";
import {
  TrendingUp,
  AlertCircle,
  MapPin,
  Plus,
  Clock,
  DollarSign,
} from "lucide-react";
import styles from "./RetailerDashboard.module.css";

export default function RetailerDashboard({ data }) {
  // Use data from parent, fallback to empty objects
  const subscription = data?.subscription || null;
  const stores = data?.stores || [];
  const campaigns = data?.campaigns || [];

  // Handle missing data
  if (!data) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>Dashboard data unavailable</div>
      </div>
    );
  }

  const planName = subscription?.planName || subscription?.displayName;
  const isSmart = planName?.toLowerCase().includes("smart");
  const isCore = planName?.toLowerCase().includes("core");
  const planTheme = isSmart ? "smart" : "core";

  // Calculate metrics
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalStores = stores.length;
  const totalScans = campaigns.reduce((sum, c) => sum + (c.totalScans || c.scans || 0), 0);

  // Get primary store (first or selected)
  const primaryStore = stores[0];

  // Get scratch card data
  const scratches = primaryStore?.scratchCards || {};
  const totalScratch = scratches.total_scratch_cards || 10000;
  const usedScratch = scratches.used_scratch_cards || 0;
  const remainingScratch = totalScratch - usedScratch;
  const scratchPercentage =
    totalScratch > 0 ? Math.round((usedScratch / totalScratch) * 100) : 0;

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>
          {primaryStore?.name || "Dashboard"}
        </h1>
        <p className={styles.dashboardSubtitle}>Overview</p>
      </div>

      {/* Hero Card */}
      <div className={styles.heroSection}>
        <div className={`${styles.heroCard} ${styles[planTheme]}`}>
          <div className={styles.heroCardHeader}>
            <h2 className={styles.heroCardTitle}>{planName || "Plan"}</h2>
            <span className={styles.heroBadge}>
              <TrendingUp size={14} />
              ACTIVE
            </span>
          </div>

          <div className={styles.heroCardContent}>
            <div className={styles.metricGroup}>
              <span className={styles.metricLabel}>Campaigns</span>
              <span className={styles.metricValue}>
                {activeCampaigns}/
                {subscription?.limits?.campaigns === -1
                  ? "∞"
                  : subscription?.limits?.campaigns}
              </span>
            </div>
            <div className={styles.metricGroup}>
              <span className={styles.metricLabel}>Stores</span>
              <span className={styles.metricValue}>
                {totalStores}/
                {subscription?.limits?.stores === -1
                  ? "∞"
                  : subscription?.limits?.stores}
              </span>
            </div>
            {isSmart && (
              <div className={styles.metricGroup}>
                <span className={styles.metricLabel}>Total Scans</span>
                <span className={styles.metricValue}>
                  {totalScans.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan-Specific Stats Cards */}
      <div className={styles.statsSection}>
        {isCore ? (
          // CORE PLAN STATS - Single Store Focus
          <>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Active Campaigns</div>
                <div className={styles.statValue}>{activeCampaigns}</div>
                <div className={styles.statSubtext}>
                  Max: {subscription?.limits?.campaigns}
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏪</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Your Store</div>
                <div className={styles.statValue}>
                  {primaryStore?.name || "1"}
                </div>
                <div className={styles.statSubtext}>
                  {primaryStore?.address || "Single Store Plan"}
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Scans</div>
                <div className={styles.statValue}>{totalScans}</div>
                <div className={styles.statSubtext}>
                  This Month
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎟️</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Scratches Left</div>
                <div className={styles.statValue}>
                  {remainingScratch.toLocaleString()}
                </div>
                <div className={styles.statSubtext}>
                  {scratchPercentage}% Used
                </div>
              </div>
            </div>
          </>
        ) : (
          // SMART PLAN STATS - Multi-Store Focus
          <>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏢</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Stores</div>
                <div className={styles.statValue}>{totalStores}</div>
                <div className={styles.statSubtext}>
                  Max: {subscription?.limits?.stores === -1 ? "Unlimited" : subscription?.limits?.stores}
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Active Campaigns</div>
                <div className={styles.statValue}>{activeCampaigns}</div>
                <div className={styles.statSubtext}>
                  Max: {subscription?.limits?.campaigns === -1 ? "Unlimited" : subscription?.limits?.campaigns}
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Scans</div>
                <div className={styles.statValue}>
                  {totalScans.toLocaleString()}
                </div>
                <div className={styles.statSubtext}>
                  Across All Stores
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎟️</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Scratches</div>
                <div className={styles.statValue}>
                  {(stores.reduce((sum, s) => sum + (s.scratchCards?.total_scratch_cards || 0), 0)).toLocaleString()}
                </div>
                <div className={styles.statSubtext}>
                  Allocated to Stores
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Scratch Section */}
      {primaryStore && (
        <div className={styles.scratchCardSection}>
          <div className={styles.scratchCardContent}>
            <div className={styles.scratchLeft}>
              <span className={styles.scratchTitle}>Scratch Inventory</span>
              <span className={styles.scratchNumber}>
                {remainingScratch.toLocaleString()}
              </span>
              <span className={styles.scratchLabel}>Scratches Remaining</span>
            </div>

            <div className={styles.scratchRight}>
              <div className={styles.progressSection}>
                <span className={styles.usedLabel}>
                  {usedScratch.toLocaleString()} Used
                </span>
                <span className={styles.percentage}>{scratchPercentage}%</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${scratchPercentage}%` }}
                />
              </div>
              <button className={styles.actionButton}>
                Buy More Scratches
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Store View (Smart Plan Only) */}
      {isSmart && stores.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>
            Your Stores
            <a href="/stores" className={styles.sectionLink}>
              View all
            </a>
          </h2>
          <div className={styles.storesGrid}>
            {stores.map((store) => {
              const storeScratch = store.scratchCards || {};
              const storeTotal = storeScratch.total_scratch_cards || 0;
              const storeUsed = storeScratch.used_scratch_cards || 0;
              const storeProgress =
                storeTotal > 0
                  ? Math.round((storeUsed / storeTotal) * 100)
                  : 0;
              const storeCampaigns = campaigns.filter(
                (c) => c.storeId === store._id
              ).length;

              return (
                <div key={store._id} className={styles.storeCard}>
                  <div className={styles.storeCardHeader}>
                    <div className={styles.storeAvatar}>
                      {store.name?.charAt(0) || "S"}
                    </div>
                    <span className={styles.storeStatus}>
                      ✓ Active
                    </span>
                  </div>

                  <h3 className={styles.storeName}>{store.name}</h3>
                  <p className={styles.storeLocation}>
                    <MapPin size={12} />
                    {store.address || "Location"}
                  </p>

                  <div className={styles.storeMetrics}>
                    <div className={styles.storeMetric}>
                      <span className={styles.storeMetricLabel}>
                        Campaigns
                      </span>
                      <span className={styles.storeMetricValue}>
                        {storeCampaigns}
                      </span>
                    </div>
                    <div className={styles.storeMetric}>
                      <span className={styles.storeMetricLabel}>
                        Scratches
                      </span>
                      <span className={styles.storeMetricValue}>
                        {storeTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className={styles.storeProgress}>
                    <span>Scratch Allocation</span>
                    <span>{storeProgress}%</span>
                  </div>
                  <div className={styles.storeProgressBar}>
                    <div
                      className={styles.storeProgressFill}
                      style={{ width: `${storeProgress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Stores Message */}
      {stores.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>🏪</div>
          <h3 className={styles.emptyStateTitle}>No Stores Yet</h3>
          <p className={styles.emptyStateText}>
            Create your first store to get started with campaigns
          </p>
        </div>
      )}

      {/* Active Campaigns Section */}
      {campaigns.length > 0 && (
        <div className={styles.campaignSection}>
          <h2 className={styles.sectionTitle}>
            Active Campaigns
            <a href="/campaign" className={styles.sectionLink}>
              View all
            </a>
          </h2>
          <div className={styles.campaignsGrid}>
            {campaigns
              .filter((c) => c.status === "active")
              .slice(0, 3)
              .map((campaign) => {
                const store = stores.find((s) => s._id === campaign.storeId);
                const daysLeft = campaign.daysRemaining || 0;

                return (
                  <div key={campaign._id} className={styles.campaignCard}>
                    <div className={styles.campaignHeader}>
                      <h3 className={styles.campaignName}>{campaign.name}</h3>
                    </div>

                    <p className={styles.campaignMeta}>
                      <Clock size={12} />
                      {daysLeft} days left
                    </p>

                    {store && (
                      <p className={styles.campaignMeta}>
                        <MapPin size={12} />
                        {store.name}
                      </p>
                    )}

                    {campaign.billingRange && (
                      <p className={styles.campaignPrice}>
                        <DollarSign size={12} />
                        ₹ {campaign.billingRange}
                      </p>
                    )}

                    <div className={styles.campaignBudgetBar}>
                      <div
                        className={styles.campaignBudgetFill}
                        style={{
                          width: `${Math.min(
                            (campaign.scans || 0) /
                              (campaign.maxScans || 1000) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className={styles.campaignMeta}>
                      {campaign.scans || 0} / {campaign.maxScans || 0} scans
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
