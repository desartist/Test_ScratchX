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
  Ticket,
  Plus,
} from "lucide-react";
import styles from "./page.module.css";
import { useAuthContext } from "@/components/auth/AuthContext";
import { criticalFetchService } from "@/lib/criticalFetchService";
import Badge from "@/components/dashboard/Badge";
import StoreAssignment from "@/components/campaign/StoreAssignment";
import RewardRanges from "@/components/campaign/RewardRanges";
import ScratchAllocationModal from "@/components/campaign/ScratchAllocationModal";
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

  // Launch wizard modal state
  const [launchWizardOpen, setLaunchWizardOpen] = useState(false);

  // Fetch campaign details with critical-first pattern
  // Critical: campaign, ranges, and subscription (needed for correct UI display)
  const fetchCampaignDetails = useCallback(
    async (id) => {
      if (!account?.id) {
        setError("User authentication required");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await criticalFetchService.fetchCriticalFirst(
          `campaign-detail-${id}`,
          [
            {
              key: 'campaign',
              url: `/api/campaigns/${id}`,
              options: {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'x-user-id': account.id,
                  'x-user-role': account.role || 'Merchant',
                },
              },
            },
            {
              key: 'ranges',
              url: `/api/campaign_range?id=${id}`,
              options: {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'x-user-id': account.id,
                  'x-user-role': account.role || 'Merchant',
                },
              },
            },
            {
              key: 'subscription',
              url: '/api/subscription/status',
              options: {
                method: 'GET',
                credentials: 'include',
              },
            },
          ],
          []
        );

        // Handle critical data
        const campaignData = result.critical?.campaign;
        if (campaignData?.success && campaignData?.data) {
          setCampaign(campaignData.data);
          const activeStores = (campaignData.data.assignedStores || []).filter(
            (s) => s.status === 'active',
          );
          setAssignedStores(activeStores);
        } else {
          setError('Campaign not found');
          setCampaign(null);
        }

        const rangesData = result.critical?.ranges;
        if (rangesData?.success && Array.isArray(rangesData?.ranges)) {
          setRanges(rangesData.ranges);
        } else {
          setRanges([]);
        }

        // Handle subscription data (now critical)
        const subscriptionData = result.critical?.subscription;
        if (subscriptionData?.success) {
          setSubscription(subscriptionData);
        }
      } catch (err) {
        console.error('Failed to fetch campaign:', err);
        setError('Failed to load campaign details');
        setCampaign(null);
      } finally {
        setLoading(false);
      }
    },
    [account],
  );

  // Callback to handle status updates from CampaignStatusActions
  const handleStatusUpdated = useCallback((updatedCampaign) => {
    setCampaign(updatedCampaign);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Unwrap params and fetch campaign details with all data
  useEffect(() => {
    async function unwrapParams() {
      try {
        const { id } = await params;
        setCampaignId(id);
        // Single call handles all critical data: campaign, ranges, subscription
        fetchCampaignDetails(id);
      } catch (err) {
        console.error("Failed to unwrap params:", err);
        setError("Failed to load campaign");
      }
    }

    unwrapParams();
  }, [
    params,
    fetchCampaignDetails,
    refreshTrigger,
  ]);

  // Refetch everything that gates the QR checklist (campaign, ranges,
  // subscription) after a child section changes data.
  const refetch = useCallback(() => {
    if (!campaignId) return;
    fetchCampaignDetails(campaignId);
  }, [campaignId, fetchCampaignDetails]);

  // Handle launch wizard completion
  const handleLaunchWizardClose = useCallback(() => {
    setLaunchWizardOpen(false);
  }, []);

  const handleLaunchWizardComplete = useCallback(() => {
    setLaunchWizardOpen(false);
    refetch();
  }, [refetch]);

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
        <div className={styles.errorContainer}>
          <p style={{ margin: 0, marginBottom: '16px' }}>{error}</p>
          <button
            onClick={() => router.push('/campaign')}
            style={{
              background: 'linear-gradient(135deg, #ef9e1b, #f5b23a)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 158, 27, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <p style={{ margin: 0, fontSize: '1.1rem', color: '#010f44', fontWeight: '600' }}>Campaign not found</p>
          <p style={{ margin: 0, color: '#637080', fontSize: '0.95rem' }}>The campaign you're looking for doesn't exist or may have been deleted.</p>
          <button
            onClick={() => router.push('/campaign')}
            style={{
              background: 'linear-gradient(135deg, #ef9e1b, #f5b23a)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 28px',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(239, 158, 27, 0.3)',
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
            View All Campaigns
          </button>
        </div>
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
      {/* 2-column layout */}
      <div className={styles.layout}>
        {/* ── Left / main column ── */}
        <div className={styles.main}>
          {/* Overview */}
          <section className={styles.overviewCard}>
            <div className={styles.overviewTop}>
              <h2 className={styles.overviewName}>{campaignName}</h2>
              <Badge label={status} variant={statusToVariant(status)} />
            </div>
            <div className={styles.overviewMeta}>
              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <CalendarDays size={14} />
                  {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <Circle size={7} className={styles.metaDot} />
                  {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </span>
                <span className={styles.metaItem}>
                  <StoreIcon size={14} />
                  {activeStoreCount} {activeStoreCount === 1 ? "store" : "stores"}
                </span>
                {priceRange && (
                  <span className={styles.metaItem}>
                    <Tag size={14} />
                    {priceRange}
                  </span>
                )}
              </div>
            </div>
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
                <p className={styles.detailValue}>{formatDate(campaign.startDate)}</p>
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
          {allocated > 0 ? (
            <div className={styles.section}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 className={styles.sectionTitle}>Scratches Allocation</h2>
                <button
                  type="button"
                  onClick={() => setLaunchWizardOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #ef9e1b, #f5b23a)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(239, 158, 27, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <Plus size={16} />
                  Modify
                </button>
              </div>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Available</label>
                  <p className={styles.detailValue} style={{ color: '#ef9e1b', fontSize: '1.2rem', fontWeight: '700' }}>
                    {availableScratches === "Unlimited" ? "∞ Unlimited" : availableScratches}
                  </p>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Allocated</label>
                  <p className={styles.detailValue}>{allocated.toLocaleString()}</p>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Used</label>
                  <p className={styles.detailValue}>{used.toLocaleString()}</p>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Remaining</label>
                  <p className={styles.detailValue} style={{ color: remaining > 0 ? '#27ae60' : '#c0392b' }}>
                    {remaining.toLocaleString()}
                  </p>
                </div>
              </div>
              {remaining === 0 && allocated > 0 && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 14px',
                  background: '#fff3cd',
                  border: '1.5px solid #fde8ba',
                  borderRadius: '10px',
                  color: '#856404',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                }}>
                  All allocated scratches have been used. Allocate more to continue.
                </div>
              )}
            </div>
          ) : (
            <div className={styles.section} style={{ textAlign: 'center', padding: '40px 24px' }}>
              <Ticket size={40} style={{ color: '#ef9e1b', marginBottom: '16px', opacity: 0.7 }} />
              <h2 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>No Scratches Allocated</h2>
              <p style={{ color: '#637080', marginBottom: '20px', fontSize: '0.95rem' }}>
                Allocate scratches to enable customers to play and win rewards
              </p>
              <button
                type="button"
                onClick={() => setLaunchWizardOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #ef9e1b, #f5b23a)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 28px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(239, 158, 27, 0.3)',
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
                <Plus size={18} />
                Allocate Scratches
              </button>
            </div>
          )}

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

        {/* ── Right / sidebar column ── */}
        <div className={styles.sidebar}>
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
                        <CheckCircle2 size={16} className={styles.checkIconMet} />
                      ) : (
                        <Circle size={16} className={styles.checkIconUnmet} />
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
                      <p className={styles.upgradeTitle}>Purchase a plan to generate QR</p>
                      <p className={styles.upgradeText}>
                        An active subscription with scratch entitlement is required.
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
        </div>
      </div>

      {/* Scratch Allocation Modal */}
      <ScratchAllocationModal
        campaignId={campaignId}
        open={launchWizardOpen}
        onClose={handleLaunchWizardClose}
        onAllocated={handleLaunchWizardComplete}
      />
    </div>
  );
}
