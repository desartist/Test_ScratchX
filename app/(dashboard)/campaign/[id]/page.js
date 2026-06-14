"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  CalendarDays,
  Store as StoreIcon,
  Tag,
  QrCode,
  Lock,
} from "lucide-react";
import styles from "./page.module.css";
import { useAuthContext } from "@/components/auth/AuthContext";
import Badge from "@/components/dashboard/Badge";
import ProgressBar from "@/components/dashboard/ProgressBar";
import StoreAssignment from "@/components/campaign/StoreAssignment";
import RewardRanges from "@/components/campaign/RewardRanges";
import ScratchAllocation from "@/components/campaign/ScratchAllocation";
import CampaignQrStudio from "@/components/campaign/CampaignQrStudio";
import StatusBadge from "./components/StatusBadge";
import CampaignStatusActions from "./components/CampaignStatusActions";

// Map campaign status -> Badge variant
function statusToVariant(status) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "ended":
      return "danger";
    case "draft":
    default:
      return "default";
  }
}

export default function CampaignDetailsPage({ params }) {
  const router = useRouter();
  const { account } = useAuthContext();

  const [campaignId, setCampaignId] = useState("");
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Assigned stores state
  const [assignedStores, setAssignedStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);

  // Ranges + subscription state (for gating checklist)
  const [ranges, setRanges] = useState([]);
  const [subscription, setSubscription] = useState(null);

  // QR generation state
  const [generatingQr, setGeneratingQr] = useState(false);
  const [qrError, setQrError] = useState(null);

  // Fetch campaign details
  const fetchCampaignDetails = useCallback(
    async (id) => {
      if (!account?.id) {
        setError("User authentication required");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/campaigns/${id}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-user-id": account.id,
            "x-user-role": account.role || "Merchant",
          },
        });

        const data = await response.json();

        if (data.success && data.data) {
          setCampaign(data.data);
          // Filter for active assignments only (exclude soft-deleted 'removed' status)
          const activeStores = (data.data.assignedStores || []).filter(
            (s) => s.status === "active",
          );
          setAssignedStores(activeStores);
        } else {
          setError("Campaign not found");
          setCampaign(null);
        }
      } catch (err) {
        console.error("Failed to fetch campaign:", err);
        setError("Failed to load campaign details");
        setCampaign(null);
      } finally {
        setLoading(false);
      }
    },
    [account],
  );

  // Fetch assigned stores
  const fetchAssignedStores = useCallback(
    async (id) => {
      if (!account?.id) return;

      setStoresLoading(true);

      try {
        const response = await fetch(`/api/campaigns/${id}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-user-id": account.id,
            "x-user-role": account.role || "Merchant",
          },
        });

        const data = await response.json();
        if (data.success && data.data && data.data.assignedStores) {
          // Filter for active assignments only (exclude soft-deleted 'removed' status)
          const activeStores = (data.data.assignedStores || []).filter(
            (s) => s.status === "active",
          );
          setAssignedStores(activeStores);
        } else {
          setAssignedStores([]);
        }
      } catch (err) {
        console.error("Failed to fetch assigned stores:", err);
        setAssignedStores([]);
      } finally {
        setStoresLoading(false);
      }
    },
    [account],
  );

  // Fetch reward ranges (gating: condition b)
  const fetchRanges = useCallback(
    async (id) => {
      if (!id || !account?.id) return;
      try {
        const response = await fetch(`/api/campaign_range?id=${id}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-user-id": account.id,
            "x-user-role": account.role || "Merchant",
          },
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.ranges)) {
          setRanges(data.ranges);
        } else {
          setRanges([]);
        }
      } catch (err) {
        console.error("Failed to fetch ranges:", err);
        setRanges([]);
      }
    },
    [account],
  );

  // Fetch subscription status (gating: condition e)
  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch(`/api/subscription/status`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (data && data.success) {
        setSubscription(data);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
      setSubscription(null);
    }
  }, []);

  // Callback to handle status updates from CampaignStatusActions
  const handleStatusUpdated = useCallback((updatedCampaign) => {
    setCampaign(updatedCampaign);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Unwrap params and fetch
  useEffect(() => {
    async function unwrapParams() {
      try {
        const { id } = await params;
        setCampaignId(id);
        fetchCampaignDetails(id);
        fetchAssignedStores(id);
        fetchRanges(id);
        fetchSubscription();
      } catch (err) {
        console.error("Failed to unwrap params:", err);
        setError("Failed to load campaign");
      }
    }

    unwrapParams();
  }, [
    params,
    fetchCampaignDetails,
    fetchAssignedStores,
    fetchRanges,
    fetchSubscription,
    refreshTrigger,
  ]);

  // Refetch everything that gates the QR checklist (campaign, ranges,
  // subscription) after a child section changes data.
  const refetch = useCallback(() => {
    if (!campaignId) return;
    fetchCampaignDetails(campaignId);
    fetchRanges(campaignId);
    fetchSubscription();
  }, [campaignId, fetchCampaignDetails, fetchRanges, fetchSubscription]);

  // Refetch campaign details after store assignment changes
  const handleStoresChanged = useCallback(() => {
    if (campaignId) {
      fetchCampaignDetails(campaignId);
    }
  }, [campaignId, fetchCampaignDetails]);

  // Generate QR code (server re-validates)
  const handleGenerateQr = useCallback(async () => {
    if (!campaignId || !account?.id) return;
    setGeneratingQr(true);
    setQrError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate-qr`, {
        method: "POST",
        credentials: "include",
        headers: {
          "x-user-id": account.id,
          "x-user-role": account.role || "Merchant",
        },
      });
      const data = await response.json();
      if (data.success) {
        // Refetch campaign to pick up qrCodeUrl + active status
        fetchCampaignDetails(campaignId);
      } else {
        setQrError(data.message || "Failed to generate QR code");
      }
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      setQrError("Failed to generate QR code");
    } finally {
      setGeneratingQr(false);
    }
  }, [campaignId, account, fetchCampaignDetails]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          Loading campaign details...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          title="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className={styles.errorContainer}>{error}</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className={styles.container}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          title="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className={styles.emptyState}>Campaign not found</div>
      </div>
    );
  }

  // ---- Derived display values (campaign is guaranteed non-null below) ----
  const campaignName = campaign.name || campaign.campaignName || "Campaign";
  const status = campaign.status || "draft";

  // Plan type + store limit (Core => 1 store, Smart => 5 stores).
  // Prefer a real maxStores value from the subscription payload if present.
  const planType = (subscription?.plan || "CORE").toUpperCase();
  const storeLimit =
    Number(subscription?.limits?.maxStores) > 0
      ? Number(subscription.limits.maxStores)
      : planType === "SMART"
        ? 5
        : 1;

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    } catch {
      return dateString;
    }
  };

  const calculateDaysLeft = () => {
    if (!campaign.endDate) return 0;
    const endDate = new Date(campaign.endDate);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  const daysLeft = calculateDaysLeft();
  const activeStoreCount = assignedStores.length;

  const allocated = campaign.allocated_scratch_cards || 0;
  const remaining =
    campaign.remaining_scratch_cards != null
      ? campaign.remaining_scratch_cards
      : Math.max(0, allocated - (campaign.used_scratch_cards || 0));
  const used = allocated - remaining;

  // Available scratches from subscription entitlement (page-derived).
  // "Unlimited" if the plan is unmetered, else the numeric remaining.
  const scratchUnlimited =
    subscription?.unlimitedScratches === true ||
    subscription?.scratchRemaining === "UNLIMITED";
  const availableScratches = scratchUnlimited
    ? "Unlimited"
    : Number(subscription?.scratchRemaining) || 0;

  // Price range from ranges (if available)
  let priceRange = null;
  if (ranges.length > 0) {
    const mins = ranges
      .map((r) => Number(r.minAmount))
      .filter((n) => Number.isFinite(n));
    const maxs = ranges
      .map((r) => Number(r.maxAmount))
      .filter((n) => Number.isFinite(n));
    if (mins.length > 0 && maxs.length > 0) {
      const lo = Math.min(...mins);
      const hi = Math.max(...maxs);
      priceRange = `₹${lo.toLocaleString()} - ₹${hi.toLocaleString()}`;
    }
  }

  // ---- Readiness gating conditions ----
  const hasActivePlan = subscription?.hasActivePlan === true;
  const scratchEntitled =
    hasActivePlan &&
    (subscription?.unlimitedScratches === true ||
      subscription?.scratchRemaining === "UNLIMITED" ||
      Number(subscription?.scratchRemaining) > 0);

  const checks = [
    { key: "basic", label: "Basic info added", met: true },
    { key: "ranges", label: "Reward ranges created", met: ranges.length > 0 },
    {
      key: "stores",
      label: "Store assigned",
      met: activeStoreCount > 0,
    },
    {
      key: "scratch",
      label: "Scratches allocated",
      met: allocated > 0,
    },
    {
      key: "subscription",
      label: "Active plan & scratch entitlement",
      met: scratchEntitled,
    },
  ];

  const allReady = checks.every((c) => c.met);
  const qrCodeUrl = campaign.qrCodeUrl;
  const alreadyGenerated =
    !!qrCodeUrl || status.toLowerCase() === "active";
  // Subscription-specific block: only the plan condition (e) fails
  const subscriptionBlocked = !alreadyGenerated && !hasActivePlan;

  return (
    <div className={styles.container}>
      {/* Header with back button */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          title="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{campaignName}</h1>
        </div>
      </div>

      {/* Overview Card */}
      <section className={styles.overviewCard}>
        <div className={styles.overviewTop}>
          <h2 className={styles.overviewName}>{campaignName}</h2>
          <Badge label={status} variant={statusToVariant(status)} />
        </div>

        <div className={styles.overviewMeta}>
          <span className={styles.metaItem}>
            <CalendarDays size={16} />
            {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
          </span>
          <span className={styles.metaItem}>
            <Circle size={8} className={styles.metaDot} />
            {daysLeft} {daysLeft === 1 ? "day" : "days"} left
          </span>
          <span className={styles.metaItem}>
            <StoreIcon size={16} />
            {activeStoreCount} {activeStoreCount === 1 ? "store" : "stores"}
          </span>
          {priceRange && (
            <span className={styles.metaItem}>
              <Tag size={16} />
              {priceRange}
            </span>
          )}
        </div>

        <div className={styles.allocationBlock}>
          <div className={styles.allocationHeader}>
            <span className={styles.allocationLabel}>Scratch Allocation</span>
            <span className={styles.allocationCount}>
              {used.toLocaleString()} / {allocated.toLocaleString()}
            </span>
          </div>
          <ProgressBar current={used} total={allocated} showLabel={false} />
          <p className={styles.allocationLeft}>
            {remaining.toLocaleString()} left
          </p>
        </div>
      </section>

      {/* QR Generation: gating checklist + button / preview / upgrade */}
      <section className={styles.qrCard}>
        <div className={styles.qrCardHeader}>
          <QrCode size={20} />
          <h2 className={styles.qrCardTitle}>Campaign QR Code</h2>
        </div>

        {alreadyGenerated ? (
          <CampaignQrStudio
            campaignId={campaignId}
            defaultBrandName={assignedStores?.[0]?.storeName || ""}
          />
        ) : (
          <>
            <ul className={styles.checklist}>
              {checks.map((c) => (
                <li
                  key={c.key}
                  className={`${styles.checkItem} ${c.met ? styles.checkMet : styles.checkUnmet}`}
                >
                  {c.met ? (
                    <CheckCircle2 size={18} className={styles.checkIconMet} />
                  ) : (
                    <Circle size={18} className={styles.checkIconUnmet} />
                  )}
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>

            {qrError && <p className={styles.qrError}>{qrError}</p>}

            {subscriptionBlocked ? (
              <div className={styles.upgradePrompt}>
                <Lock size={18} />
                <div>
                  <p className={styles.upgradeTitle}>
                    Purchase a plan to generate QR
                  </p>
                  <p className={styles.upgradeText}>
                    An active subscription with scratch entitlement is required
                    to generate a campaign QR code.
                  </p>
                </div>
                <Link href="/subscription" className={styles.primaryButton}>
                  View Plans
                </Link>
              </div>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!allReady || generatingQr}
                onClick={handleGenerateQr}
              >
                {generatingQr ? "Generating…" : "Generate QR Code"}
              </button>
            )}
          </>
        )}
      </section>

      {/* Campaign Details */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Campaign Details</h2>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <label className={styles.detailLabel}>Campaign Name</label>
            <p className={styles.detailValue}>{campaignName}</p>
          </div>
          <div className={styles.detailItem}>
            <label className={styles.detailLabel}>Status</label>
            <StatusBadge status={campaign?.status} />
          </div>
          <div className={styles.detailItem}>
            <label className={styles.detailLabel}>Start Date</label>
            <p className={styles.detailValue}>
              {formatDate(campaign.startDate)}
            </p>
          </div>
          <div className={styles.detailItem}>
            <label className={styles.detailLabel}>End Date</label>
            <p className={styles.detailValue}>{formatDate(campaign.endDate)}</p>
          </div>
          {campaign.totalCouponLimit && (
            <div className={styles.detailItem}>
              <label className={styles.detailLabel}>Display Coupons</label>
              <p className={styles.detailValue}>{campaign.totalCouponLimit}</p>
            </div>
          )}
          {campaign.description && (
            <div className={styles.detailItem}>
              <label className={styles.detailLabel}>Description</label>
              <p className={styles.detailValue}>{campaign.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Scratches Allocation */}
      <ScratchAllocation
        campaignId={campaignId}
        allocated={allocated}
        used={used}
        remaining={remaining}
        available={availableScratches}
        onChanged={refetch}
      />

      {/* Store Assignment */}
      <StoreAssignment
        campaignId={campaignId}
        assignedStores={assignedStores}
        planType={planType}
        storeLimit={storeLimit}
        onChanged={handleStoresChanged}
      />

      {/* Reward Ranges */}
      <RewardRanges
        campaignId={campaignId}
        onChanged={refetch}
        manageHref={`/campaign/${campaignId}/ranges`}
      />

      {/* Action Buttons */}
      {campaign && (
        <CampaignStatusActions
          campaign={campaign}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}
