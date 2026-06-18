"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Store as StoreIcon,
  Users,
  CreditCard,
  Ticket,
  BarChart3,
} from "lucide-react";

import { useAuthContext } from "@/components/auth/AuthContext";
import DashboardHeader from "@/components/dashboard/smart/DashboardHeader";
import SubscriptionHero from "@/components/dashboard/smart/SubscriptionHero";
import KpiTileGrid from "@/components/dashboard/smart/KpiTileGrid";
import TopCampaignCard from "@/components/dashboard/smart/TopCampaignCard";
import StorePerformanceCard from "@/components/dashboard/smart/StorePerformanceCard";
import PendingRequestCard from "@/components/dashboard/smart/PendingRequestCard";
import QuickActions from "@/components/dashboard/smart/QuickActions";
import RecentActivity from "@/components/dashboard/smart/RecentActivity";
import SectionHeader from "@/components/dashboard/smart/SectionHeader";
import EmptyState from "@/components/dashboard/smart/EmptyState";
import DashboardSkeleton from "@/components/dashboard/smart/DashboardSkeleton";
import {
  BarChart,
  LineAreaChart,
  DonutChart,
  HBarList,
} from "@/components/dashboard/smart/charts";

import styles from "./SmartDashboard.module.css";

const DONUT_PALETTE = [
  "#6d5df6",
  "#4c6ef5",
  "#ef9e1b",
  "#00b0b1",
  "#b9b0f7",
  "#f06595",
];

/** Settle a fetch into `{ ok, data, error }`, never throwing. */
async function settle(promiseResult) {
  if (promiseResult.status !== "fulfilled") {
    return { ok: false, data: null, error: promiseResult.reason };
  }
  return promiseResult.value;
}

/** Short weekday label from a YYYY-MM-DD date string. */
function weekdayShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** Whole days from now until a future date; null when not computable. */
function daysUntil(value) {
  if (!value) return null;
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}

function formatDateLabel(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SmartDashboard() {
  const router = useRouter();
  const { account, token } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [customerGrowth, setCustomerGrowth] = useState([]);
  const [scratchUsage, setScratchUsage] = useState([]);
  const [campaignConsumption, setCampaignConsumption] = useState([]);
  const [storePerf, setStorePerf] = useState({ storeWise: [], perStore: {} });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [busyRequestId, setBusyRequestId] = useState(null);

  // Build the auth headers the existing dashboard page uses, plus cookie creds.
  const buildFetcher = useCallback(() => {
    const headers = {
      "x-user-id": account?.id || account?._id || "",
      "x-user-role": account?.role || "",
      Authorization: token ? `Bearer ${token}` : "",
    };

    return async (url) => {
      try {
        const res = await fetch(url, { headers, credentials: "include" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || json.success === false) {
          return {
            ok: false,
            data: json?.data ?? null,
            error: json?.error || `Request failed (${res.status})`,
            raw: json,
          };
        }
        return { ok: true, data: json.data ?? null, error: null, raw: json };
      } catch (err) {
        return { ok: false, data: null, error: err?.message || "Network error" };
      }
    };
  }, [account, token]);

  const loadPending = useCallback(async () => {
    const fetcher = buildFetcher();
    const res = await fetcher(
      "/api/merchant/scratch-requests?status=pending",
    );
    if (res.ok && Array.isArray(res.data)) setPendingRequests(res.data);
  }, [buildFetcher]);

  const loadKpi = useCallback(async () => {
    const fetcher = buildFetcher();
    const res = await fetcher("/api/analytics/kpi-summary");
    if (res.ok && res.data) setKpi(res.data);
  }, [buildFetcher]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    const fetcher = buildFetcher();

    (async () => {
      const results = await Promise.allSettled([
        fetcher("/api/dashboard"),
        fetcher("/api/subscription/status"),
        fetcher("/api/analytics/kpi-summary"),
        fetcher("/api/analytics/customer-growth"),
        fetcher("/api/analytics/scratch-usage?days=7"),
        fetcher("/api/analytics/campaign-consumption"),
        fetcher("/api/analytics/store-performance?days=7"),
        fetcher("/api/merchant/scratch-requests?status=pending"),
        fetcher("/api/notifications/recent"),
      ]);

      if (cancelled) return;

      const [
        rDashboard,
        rSub,
        rKpi,
        rGrowth,
        rUsage,
        rConsumption,
        rStorePerf,
        rPending,
        rNotifications,
      ] = await Promise.all(results.map(settle));

      // /api/dashboard returns the merchant payload under `data`.
      if (rDashboard.ok && rDashboard.data) setDashboard(rDashboard.data);

      // /api/subscription/status returns flat fields on the JSON body.
      if (rSub.ok) setSubStatus(rSub.raw || null);

      if (rKpi.ok && rKpi.data) setKpi(rKpi.data);

      // customer-growth -> [{ label, series:{ new, repeat } }]
      if (rGrowth.ok && rGrowth.data?.weeklyTrend) {
        setCustomerGrowth(
          rGrowth.data.weeklyTrend.map((row) => ({
            label: row.day,
            series: {
              new: Number(row.new) || 0,
              repeat: Number(row.repeat) || 0,
            },
          })),
        );
      }

      // scratch-usage -> [{ label (weekday), value }]
      if (rUsage.ok && Array.isArray(rUsage.data)) {
        setScratchUsage(
          rUsage.data.map((row) => ({
            label: weekdayShort(row.date),
            value: Number(row.used) || 0,
          })),
        );
      }

      // campaign-consumption -> donut segments
      if (rConsumption.ok && Array.isArray(rConsumption.data)) {
        setCampaignConsumption(
          rConsumption.data.map((row, i) => ({
            label: row.name || "Campaign",
            value: Number(row.used) || 0,
            color: DONUT_PALETTE[i % DONUT_PALETTE.length],
          })),
        );
      }

      if (rStorePerf.ok && rStorePerf.data) {
        setStorePerf({
          storeWise: Array.isArray(rStorePerf.data.storeWise)
            ? rStorePerf.data.storeWise
            : [],
          perStore: rStorePerf.data.perStore || {},
        });
      }

      if (rPending.ok && Array.isArray(rPending.data)) {
        setPendingRequests(rPending.data);
      }

      if (rNotifications.ok && Array.isArray(rNotifications.data)) {
        setNotifications(rNotifications.data);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [account, buildFetcher]);

  const handleApprove = useCallback(
    async (request) => {
      const id = request?._id;
      if (!id) return;
      setBusyRequestId(String(id));
      try {
        const res = await fetch(
          `/api/merchant/scratch-requests/${id}/approve`,
          {
            method: "POST",
            headers: {
              "x-user-id": account?.id || account?._id || "",
              "x-user-role": account?.role || "",
              Authorization: token ? `Bearer ${token}` : "",
            },
            credentials: "include",
          },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || json.success === false) {
          alert(json?.error || "Failed to approve request");
          return;
        }
        await Promise.all([loadPending(), loadKpi()]);
      } catch (err) {
        alert(err?.message || "Failed to approve request");
      } finally {
        setBusyRequestId(null);
      }
    },
    [account, token, loadPending, loadKpi],
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  const subscription = dashboard?.subscription || null;
  const stores = Array.isArray(dashboard?.stores) ? dashboard.stores : [];
  const campaigns = Array.isArray(dashboard?.campaigns)
    ? dashboard.campaigns
    : [];
  const storePerformance = Array.isArray(dashboard?.storePerformance)
    ? dashboard.storePerformance
    : [];
  const metrics = dashboard?.metrics || {};

  const planName =
    subscription?.displayName ||
    (subStatus?.plan ? `ScratchX ${subStatus.plan}` : null) ||
    subscription?.planName ||
    null;

  // SubscriptionHero values.
  const entitlement = subscription?.scratchEntitlement || null;
  const heroDaysRemaining = Number.isFinite(subStatus?.remainingDays)
    ? subStatus.remainingDays
    : Number.isFinite(entitlement?.daysRemaining)
      ? entitlement.daysRemaining
      : Number.isFinite(subscription?.daysRemaining)
        ? subscription.daysRemaining
        : null;
  const heroValidUntil =
    formatDateLabel(subStatus?.unlimitedScratchesExpiryDate) ||
    formatDateLabel(entitlement?.validUntil) ||
    formatDateLabel(subscription?.currentPeriodEnd);
  const heroUsed = Number.isFinite(subStatus?.scratchConsumed)
    ? subStatus.scratchConsumed
    : dashboard?.scratch?.distributed;

  // Customer-insight headline numbers (only when present).
  const newCustomers = customerGrowth.reduce(
    (sum, d) => sum + (d.series?.new || 0),
    0,
  );
  const repeatCustomers = customerGrowth.reduce(
    (sum, d) => sum + (d.series?.repeat || 0),
    0,
  );
  const hasCustomerGrowth = customerGrowth.some(
    (d) => (d.series?.new || 0) > 0 || (d.series?.repeat || 0) > 0,
  );

  const consumptionTotal = campaignConsumption.reduce(
    (sum, s) => sum + (s.value || 0),
    0,
  );

  const storeWiseItems = storePerf.storeWise.map((s) => ({
    label: s.name || "Store",
    value: Number(s.used) || 0,
  }));
  const storeWiseTotal = storeWiseItems.reduce((sum, s) => sum + s.value, 0);

  const topCampaigns = campaigns.slice(0, 3);

  const quickActions = [
    {
      label: "Create Campaign",
      href: "/campaign/new",
      icon: <Megaphone size={20} />,
    },
    {
      label: "Create Store",
      href: "/stores/create",
      icon: <StoreIcon size={20} />,
    },
    { label: "View Customers", href: "/customers", icon: <Users size={20} /> },
    {
      label: "Manage Subscription",
      href: "/subscription",
      icon: <CreditCard size={20} />,
    },
    {
      label: "Purchase Scratches",
      href: "/billing/scratch-packs",
      icon: <Ticket size={20} />,
    },
    {
      label: "Generate Reports",
      href: "/analytics",
      icon: <BarChart3 size={20} />,
    },
  ];

  const primaryStore = stores[0];
  const storeName = primaryStore?.name || dashboard?.account?.firstName || "Store";
  const storeLocation = [primaryStore?.city, primaryStore?.address]
    .filter(Boolean)
    .join(", ");
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className={styles.dashboard}>
      <DashboardHeader
        storeName={storeName}
        location={storeLocation}
        unreadCount={unreadCount}
        onBellClick={() => router.push("/notifications")}
      />
      <SubscriptionHero
        planName={planName}
        status={subscription?.status}
        validUntil={heroValidUntil}
        used={heroUsed}
        daysRemaining={heroDaysRemaining}
        onViewUsage={() => router.push("/analytics")}
        onChoosePlans={() => router.push("/subscription")}
      />
      <KpiTileGrid kpi={kpi} />

      {/* Top Campaigns — only when data exists */}
      {topCampaigns.length > 0 && (
        <>
          <SectionHeader title="Top Campaigns" viewAllHref="/campaign" />
          <div className={styles.cardList}>
            {topCampaigns.map((c) => (
              <TopCampaignCard
                key={c._id}
                name={c.name}
                status={c.status}
                startDate={c.startDate}
                endDate={c.endDate}
                daysLeft={daysUntil(c.endDate)}
                storeCount={stores.length}
                priceRange={
                  c.billingRange && c.billingRange !== "₹0"
                    ? c.billingRange
                    : undefined
                }
                scratchAllocated={
                  (c.allocatedCards || 0) - (c.remainingCards || 0)
                }
                scratchTotal={c.allocatedCards || 0}
                onView={() => router.push(`/campaign/${c._id}`)}
                onAssign={() => router.push(`/campaign/${c._id}/assign`)}
              />
            ))}
          </div>
        </>
      )}

      {/* Store Performance — only when stores exist */}
      {storePerformance.length > 0 && (
        <>
          <SectionHeader title="Store Performance" viewAllHref="/stores" />
          <div className={styles.cardList}>
            {storePerformance.map((s, i) => {
              const stats = storePerf.perStore?.[String(s._id)] || {};
              return (
                <StorePerformanceCard
                  key={s._id}
                  storeName={s.name}
                  isMainStore={i === 0}
                  location={s.address || s.city}
                  scans={Number(stats.scans) || 0}
                  campaignCount={Number(s.campaignCount) || 0}
                  entitlementLabel={
                    Number.isFinite(s.scratchAllocated)
                      ? `${s.scratchAllocated} allocated`
                      : undefined
                  }
                  used={
                    Number.isFinite(s.scratchAllocated) &&
                    Number.isFinite(s.scratchRemaining)
                      ? s.scratchAllocated - s.scratchRemaining
                      : 0
                  }
                  onViewStore={() => router.push(`/stores/${s._id}`)}
                  onReview={() => router.push(`/stores/${s._id}`)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Pending Requests — only when there are pending items */}
      {pendingRequests.length > 0 && (
        <>
          <SectionHeader title="Pending Requests" />
          <div className={styles.cardList}>
            {pendingRequests.map((req) => (
              <PendingRequestCard
                key={req._id}
                title="Scratch Allocation Request"
                priority={req.priority}
                storeName={req.storeName}
                timeAgo={formatDateLabel(req.createdAt) || undefined}
                requesterName={req.requestedByName}
                requestedQty={req.quantity}
                campaignName={req.campaignName}
                note={req.reason}
                busy={busyRequestId === String(req._id)}
                onApprove={() => handleApprove(req)}
                onReview={() => router.push(`/campaign/${req.campaignId}`)}
              />
            ))}
          </div>
        </>
      )}

      {/* Charts — only render blocks that have data */}
      {(hasCustomerGrowth || scratchUsage?.length > 0 || campaignConsumption?.length > 0 || storeWiseItems.length > 0) && (
        <div className={styles.chartsGrid}>
          {(hasCustomerGrowth || customerGrowth?.length > 0) && (
            <div className={styles.chartBlock}>
              <SectionHeader title="Customer Insights" />
              {hasCustomerGrowth && (
                <div className={styles.statRow}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{newCustomers}</span>
                    <span className={styles.statLabel}>New Customers</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{repeatCustomers}</span>
                    <span className={styles.statLabel}>Repeat Customers</span>
                  </div>
                </div>
              )}
              <div className={styles.chartCard}>
                <BarChart data={customerGrowth} />
              </div>
            </div>
          )}

          {scratchUsage?.length > 0 && (
            <div className={styles.chartBlock}>
              <SectionHeader title="Scratch Consumption" />
              <div className={styles.chartCard}>
                <LineAreaChart data={scratchUsage} />
              </div>
            </div>
          )}

          {campaignConsumption?.length > 0 && (
            <div className={styles.chartBlock}>
              <SectionHeader title="Campaign-wise Consumption" />
              <div className={styles.chartCard}>
                <DonutChart
                  segments={campaignConsumption}
                  centerLabel={consumptionTotal}
                  centerSubLabel="Used"
                />
              </div>
            </div>
          )}

          {storeWiseItems.length > 0 && (
            <div className={styles.chartBlock}>
              <SectionHeader title="Store-wise Performance" />
              <div className={styles.statRow}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {storeWiseTotal.toLocaleString()}
                  </span>
                  <span className={styles.statLabel}>Total Scratches Used</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{storeWiseItems.length}</span>
                  <span className={styles.statLabel}>Active Stores</span>
                </div>
              </div>
              <div className={styles.chartCard}>
                <HBarList items={storeWiseItems} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions?.length > 0 && (
        <>
          <SectionHeader title="Quick Actions" />
          <QuickActions actions={quickActions} />
        </>
      )}

      {/* Recent Activity */}
      {notifications?.length > 0 && (
        <>
          <SectionHeader title="Recent Activity" />
          <RecentActivity items={notifications} />
        </>
      )}
    </div>
  );
}
