"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  CalendarDays,
  Circle,
  Tag,
  Store as StoreIcon,
  MapPin,
  Gift,
  QrCode,
  Users,
} from "lucide-react";
import { useStoreCampaignDetailQuery, useMyQrCustomersQuery } from "@/hooks/queries/useStoreCampaignsQuery";
import { useAuthContext } from "@/components/auth/AuthContext";
import Badge from "@/components/dashboard/Badge";
import CampaignQrStudio from "@/components/campaign/CampaignQrStudio";
import styles from "./campaign-detail.module.css";

const STATUS_COLORS = {
  initiated: "#6b7280",
  verified: "#3b82f6",
  scratched: "#f59e0b",
  revealed: "#f59e0b",
  redeemed: "#10b981",
  expired: "#ef4444",
  failed: "#ef4444",
};

const STATUS_LABELS = {
  initiated: "Initiated",
  verified: "Verified",
  scratched: "Scratched",
  revealed: "Revealed",
  redeemed: "Claimed",
  expired: "Expired",
  failed: "Failed",
};

function formatWonReward(reward) {
  if (!reward) return null;
  const { type, value, description } = reward;
  if (type === "discount" || type === "voucher") return `₹${value} OFF`;
  if (type === "cashback") return `${value}% OFF`;
  if (type === "freeItem") return description || "Free Gift";
  return value ? `₹${value} OFF` : null;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusToVariant(status) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "success";
    case "paused":
      return "warning";
    case "ended":
      return "danger";
    default:
      return "default";
  }
}

function formatDate(dateString) {
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
}

function calculateDaysLeft(endDate) {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const today = new Date();
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
}

function getCalculatedStatus(campaign) {
  const now = new Date();
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);
  if (endDate < now) return "ended";
  if (startDate > now) return "draft";
  return campaign.status || "active";
}

export default function StoreCampaignDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { account } = useAuthContext();
  const { data, isPending: loading, error: queryError } = useStoreCampaignDetailQuery(id);
  const error = queryError ? queryError.message : null;
  const { data: myCustomersData, isPending: customersLoading } = useMyQrCustomersQuery(id);
  const myCustomers = myCustomersData?.customers || [];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>Loading campaign details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <button type="button" className={styles.backLink} onClick={() => router.push("/store-campaigns")}>
          <ChevronLeft size={16} />
          Back to Campaigns
        </button>
        <div className={styles.errorContainer}>{error || "Unable to load this campaign."}</div>
      </div>
    );
  }

  const { campaign, ranges, store } = data;
  const status = getCalculatedStatus(campaign);
  const daysLeft = calculateDaysLeft(campaign.endDate);

  const allocated = campaign.allocatedScratchCards || 0;
  const used = campaign.usedScratchCards || 0;
  const redeemed = campaign.redeemedScratchCards || 0;
  const remaining = campaign.remainingScratchCards || 0;

  let priceRange = null;
  if (ranges.length > 0) {
    const mins = ranges.map((r) => Number(r.minAmount)).filter((n) => Number.isFinite(n));
    const maxs = ranges.map((r) => Number(r.maxAmount)).filter((n) => Number.isFinite(n));
    if (mins.length > 0 && maxs.length > 0) {
      priceRange = `₹${Math.min(...mins).toLocaleString()} - ₹${Math.max(...maxs).toLocaleString()}`;
    }
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backLink} onClick={() => router.push("/store-campaigns")}>
        <ChevronLeft size={16} />
        Back to Campaigns
      </button>

      <div className={styles.layout}>
        {/* ── Main column ── */}
        <div className={styles.main}>
          {/* Overview */}
          <section className={styles.overviewCard}>
            <div className={styles.overviewTop}>
              <h2 className={styles.overviewName}>{campaign.name}</h2>
              <Badge label={status} variant={statusToVariant(status)} />
            </div>
            {campaign.description && <p className={styles.overviewDescription}>{campaign.description}</p>}
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
                {priceRange && (
                  <span className={styles.metaItem}>
                    <Tag size={14} />
                    {priceRange}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* This store's scratch allocation */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>This Store&apos;s Scratch Allocation</h2>
            <div className={styles.statsGrid}>
              <div className={styles.detailItem}>
                <label className={styles.detailLabel}>Allocated</label>
                <p className={styles.detailValue}>{allocated.toLocaleString()}</p>
              </div>
              <div className={styles.detailItem}>
                <label className={styles.detailLabel}>Used</label>
                <p className={styles.detailValue}>{used.toLocaleString()}</p>
              </div>
              <div className={styles.detailItem}>
                <label className={styles.detailLabel}>Redeemed</label>
                <p className={styles.detailValue}>{redeemed.toLocaleString()}</p>
              </div>
              <div className={styles.detailItem}>
                <label className={styles.detailLabel}>Remaining</label>
                <p className={styles.detailValue} style={{ color: remaining > 0 ? "#27ae60" : "#c0392b" }}>
                  {remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Store Assignment (read-only, this store only) */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <StoreIcon size={20} />
              <h2 className={styles.sectionTitle}>Store Assignment</h2>
            </div>
            {store ? (
              <>
                <div className={styles.storeCard}>
                  <div className={styles.storeMain}>
                    <span className={styles.storeName}>{store.name}</span>
                    <span className={styles.storeMetaRow}>
                      <MapPin size={13} />
                      {store.city}, {store.address}
                    </span>
                  </div>
                  <Badge label="Assigned" variant="success" />
                </div>
                <button
                  type="button"
                  className={styles.viewStoreLink}
                  onClick={() => router.push("/store-details")}
                >
                  View Store Details →
                </button>
              </>
            ) : (
              <p className={styles.stateMsg}>Store details unavailable.</p>
            )}
          </section>

          {/* Reward Ranges (read-only) */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Tag size={20} />
              <h2 className={styles.sectionTitle}>Reward Ranges</h2>
            </div>
            {ranges.length === 0 ? (
              <p className={styles.stateMsg}>No reward ranges configured for this campaign.</p>
            ) : (
              <div className={styles.rangeGrid}>
                {ranges.map((r) => (
                  <div key={r._id} className={styles.rangeCard}>
                    <span className={styles.rangeLabel}>{r.label}</span>
                    <div className={styles.rewardRow}>
                      <Gift size={14} />
                      <span className={styles.rewardCount}>
                        {(r.rewards || []).length} reward{(r.rewards || []).length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Customers who scanned my personalized QR code */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Users size={20} />
              <h2 className={styles.sectionTitle}>Customers from My QR Code</h2>
            </div>
            {customersLoading ? (
              <p className={styles.stateMsg}>Loading customers...</p>
            ) : myCustomers.length === 0 ? (
              <p className={styles.stateMsg}>
                No customers have scanned your QR code for this campaign yet.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Mobile</th>
                      <th>Reward</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCustomers.map((customer) => (
                      <tr key={customer._id}>
                        <td className={styles.customerName}>{customer.name || "-"}</td>
                        <td>{customer.mobile || "-"}</td>
                        <td>{formatWonReward(customer.reward) || "-"}</td>
                        <td>
                          <span
                            className={styles.statusPill}
                            style={{ borderColor: STATUS_COLORS[customer.status] }}
                          >
                            <span
                              className={styles.statusDot}
                              style={{ backgroundColor: STATUS_COLORS[customer.status] }}
                            />
                            {STATUS_LABELS[customer.status] || customer.status}
                          </span>
                        </td>
                        <td>{formatDateTime(customer.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          <section className={styles.qrCard}>
            <div className={styles.qrCardHeader}>
              <QrCode size={20} />
              <h2 className={styles.qrCardTitle}>Campaign QR Code</h2>
            </div>
            <CampaignQrStudio
              campaignId={String(id)}
              defaultBrandName={store?.name || ""}
              storeName={store?.name || ""}
              campaignName={campaign.name || ""}
              startDate={campaign.startDate}
              endDate={campaign.endDate}
              // This page only ever belongs to the logged-in Store_Manager/
              // Store_Staff themselves — always show their own personalized
              // QR automatically, no picker needed.
              fixedStaffId={account?.id || account?._id || null}
              fixedStaffName={account?.name || null}
              staffStoreId={store?._id || null}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
