"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, CalendarDays, Store as StoreIcon } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { criticalFetchService } from "@/lib/criticalFetchService";
import Badge from "@/components/dashboard/Badge";
import CampaignQrStudio from "@/components/campaign/CampaignQrStudio";
import styles from "./page.module.css";

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

export default function CampaignLiveViewPage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();

  const [campaignId, setCampaignId] = useState("");
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Unwrap params and fetch campaign with caching
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const { id } = await params;
        setCampaignId(id);

        if (!account?.id) {
          setError("User authentication required");
          setLoading(false);
          return;
        }

        const result = await criticalFetchService.fetchCriticalFirst(
          `campaign-live-${id}`,
          [
            {
              key: 'campaign',
              url: `/api/campaigns/${id}`,
              options: {
                method: "GET",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": account.id,
                  "x-user-role": account.role || "Merchant",
                },
              },
            },
          ],
          []
        );

        const data = result.critical?.campaign;
        const campaignData = data?.data || data;

        if (!campaignData?._id) {
          throw new Error("Invalid campaign data");
        }

        setCampaign(campaignData);
      } catch (err) {
        console.error("Failed to fetch campaign:", err);
        setError(err.message || "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [params, account]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN");
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading campaign...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button
              className={styles.backBtn}
              onClick={() => router.push("/campaign")}
              title="Back to campaigns"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
          <div className={styles.errorContainer}>
            <h2>Error</h2>
            <p>{error || "Campaign not found"}</p>
            <button
              className={styles.primaryButton}
              onClick={() => router.push("/campaign")}
            >
              Back to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  const campaignName = campaign.campaignName || campaign.name || "Campaign";
  const status = campaign.status?.toLowerCase() || "draft";
  const activeStores = (campaign.assignedStores || []).filter(
    (s) => s.status === "active",
  );
  const assignedStoresCount =
    activeStores.length ||
    campaign.storeCount ||
    campaign.storeAllocations?.length ||
    0;

  const metrics = [
    { label: "Total Scans", value: (campaign.totalScans || 0).toLocaleString("en-IN") },
    { label: "Conversions", value: (campaign.conversions || 0).toLocaleString("en-IN") },
    { label: "Participation", value: `${campaign.participationRate || "0"}%` },
    {
      label: "Revenue",
      value: `₹${(campaign.revenue || 0).toLocaleString("en-IN")}`,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => router.push(`/campaign/${campaignId}`)}
            title="Back to campaign details"
          >
            <ChevronLeft size={20} />
          </button>
          <div className={styles.headerContent}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{campaignName}</h1>
              <Badge label={status} variant={statusToVariant(status)} />
            </div>
            <p className={styles.subtitle}>
              {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
            </p>
          </div>
        </div>

        {/* Two-column layout: details + metrics (left) / QR studio (right) */}
        <div className={styles.contentGrid}>
          {/* Left Column */}
          <div className={styles.summaryCard}>
            {/* Campaign Details Section */}
            <div className={styles.cardSection}>
              <h2 className={styles.sectionTitle}>Campaign Details</h2>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Campaign Name</span>
                  <span className={styles.detailValue}>{campaignName}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>
                    <CalendarDays size={13} /> Start Date
                  </span>
                  <span className={styles.detailValue}>
                    {formatDate(campaign.startDate)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>
                    <CalendarDays size={13} /> End Date
                  </span>
                  <span className={styles.detailValue}>
                    {formatDate(campaign.endDate)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>
                    <StoreIcon size={13} /> Assigned Stores
                  </span>
                  <span className={styles.detailValue}>
                    {assignedStoresCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metrics Section */}
            <div className={styles.cardSection}>
              <h2 className={styles.sectionTitle}>Performance Metrics</h2>
              <div className={styles.metricsGrid}>
                {metrics.map((m) => (
                  <div key={m.label} className={styles.metricItem}>
                    <span className={styles.metricLabel}>{m.label}</span>
                    <span className={styles.metricValue}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: QR Studio */}
          <div className={styles.qrCard}>
            <h2 className={styles.sectionTitle}>Scan to Participate</h2>
            <CampaignQrStudio
              campaignId={campaignId}
              defaultBrandName={activeStores?.[0]?.storeName || ""}
              initialStyle={campaign.qrStyle}
              persist
            />
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className={styles.actionsSection}>
          <button
            className={styles.primaryButton}
            onClick={() => router.push(`/campaign/${campaignId}`)}
          >
            View Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
