"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Megaphone,
  ScanLine,
  TrendingUp,
  Users,
  Store,
  User,
  Phone,
  Eye,
} from "lucide-react";
import { useStoreViewQuery } from "@/hooks/queries/useStoreViewQuery";
import styles from "./store-details.module.css";

const STATUS_VARIANT = { active: "statusBadgeActive", inactive: "statusBadgeInactive", suspended: "statusBadgeSuspended" };

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

export default function StoreDetailsPage() {
  const router = useRouter();
  const { data, isPending: loading, error: queryError } = useStoreViewQuery();
  const error = queryError ? queryError.message || "Failed to load store" : null;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>Loading store details…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <button className={styles.backButton} onClick={() => router.back()} title="Go back">
          <ChevronLeft size={20} />
        </button>
        <div className={styles.errorContainer}>{error || "Store not found"}</div>
      </div>
    );
  }

  const { store, stats, campaigns } = data;
  const isMainStore = !!store.is_main_store;
  const statusKey = store.status || "active";
  const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
  const statusClass = styles[STATUS_VARIANT[statusKey]] || styles.statusBadgeActive;

  const initials =
    (store.contact_person || "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()} title="Go back">
          <ChevronLeft size={20} />
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{store.store_name}</h1>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewTop}>
          <div className={styles.storeMeta}>
            <h2 className={styles.overviewName}>{store.store_name}</h2>
            <p className={styles.overviewLocation}>
              <MapPin size={14} />
              {store.city}, {store.state}
            </p>
            {isMainStore && <span className={styles.mainStoreBadge}>⭐ Main Store</span>}
          </div>
          <span className={statusClass}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "currentColor",
                display: "inline-block",
              }}
            />
            {statusLabel}
          </span>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statTile}>
            <div className={styles.statIcon}>
              <Megaphone size={16} />
            </div>
            <p className={styles.statValue}>{stats.activeCampaigns || 0}</p>
            <span className={styles.statLabel}>Active Campaigns</span>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statIcon}>
              <ScanLine size={16} />
            </div>
            <p className={styles.statValue}>{stats.totalScans || 0}</p>
            <span className={styles.statLabel}>Total Scans</span>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statIcon}>
              <TrendingUp size={16} />
            </div>
            <p className={styles.statValue}>{stats.conversions || 0}</p>
            <span className={styles.statLabel}>Conversions</span>
          </div>
          <div className={styles.statTile}>
            <div className={styles.statIcon}>
              <Users size={16} />
            </div>
            <p className={styles.statValue}>{stats.totalCustomers || 0}</p>
            <span className={styles.statLabel}>Customers</span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.layout}>
        {/* Left: Main */}
        <div className={styles.main}>
          {/* Store Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>
                <Store size={14} />
              </span>
              Store Details
            </h2>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Store Name</span>
                <p className={styles.detailValue}>{store.store_name}</p>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Address</span>
                <p className={styles.detailValue}>{store.address}</p>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>City</span>
                <p className={styles.detailValue}>{store.city}</p>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>State</span>
                <p className={styles.detailValue}>{store.state}</p>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Pincode</span>
                <p className={styles.detailValue}>{store.pincode}</p>
              </div>
            </div>
          </div>

          {/* Assigned Campaigns (read-only) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>
                <Megaphone size={14} />
              </span>
              Assigned Campaigns
            </h2>
            {campaigns.length === 0 ? (
              <p className={styles.emptyText}>No campaigns assigned to this store yet.</p>
            ) : (
              <div className={styles.campaignList}>
                {campaigns.map((c) => (
                  <div key={c._id} className={styles.campaignRow}>
                    <div>
                      <div className={styles.campaignName}>{c.name}</div>
                      <div className={styles.campaignMeta}>
                        <span className={`${styles.campaignBadge} ${styles[`campaign_${c.status}`] || ""}`}>
                          {c.status || "draft"}
                        </span>
                        <span className={styles.campaignDates}>
                          {formatDate(c.startDate)} – {formatDate(c.endDate)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.campaignStats}>
                      <div>
                        <span className={styles.campaignStatValue}>{c.allocated}</span>
                        <span className={styles.campaignStatLabel}>Allocated</span>
                      </div>
                      <div>
                        <span className={styles.campaignStatValue}>{c.remaining}</span>
                        <span className={styles.campaignStatLabel}>Remaining</span>
                      </div>
                      <button
                        type="button"
                        className={styles.viewButton}
                        onClick={() => router.push(`/store-campaigns/${c._id}`)}
                        title="View campaign"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>
                <User size={14} />
              </span>
              Contact Info
            </h2>
            <div className={styles.managerChip}>
              <div className={styles.managerAvatar}>{initials}</div>
              <div>
                <div className={styles.managerName}>{store.contact_person || "N/A"}</div>
                <div className={styles.managerRole}>Store Contact</div>
              </div>
            </div>
            <div className={styles.detailGroup}>
              <div className={styles.detailRow}>
                <span className={styles.detailRowLabel}>Phone</span>
                <span className={styles.detailRowValue}>{store.contact_number || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
