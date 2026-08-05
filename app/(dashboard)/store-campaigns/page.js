"use client";

import React from "react";
import { AlertCircle, Megaphone } from "lucide-react";
import { useStoreCampaignsQuery } from "@/hooks/queries/useStoreCampaignsQuery";
import LoadingState from "@/components/common/LoadingState";
import styles from "./store-campaigns.module.css";

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function StoreCampaignsPage() {
  const { data: campaigns, isPending: loading, error: queryError } = useStoreCampaignsQuery();
  const error = queryError ? queryError.message : null;

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingState message="Loading campaigns..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Campaigns</h1>
        <p className={styles.pageSubtitle}>Campaigns currently allocated to your store</p>
      </div>

      {campaigns.length === 0 ? (
        <div className={styles.emptyState}>
          <Megaphone size={40} />
          <p>No campaigns are allocated to your store yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {campaigns.map((c) => (
            <div key={c._id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <h2 className={styles.campaignName}>{c.name}</h2>
                  <p className={styles.dateRange}>
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </p>
                </div>
                <span className={`${styles.statusBadge} ${styles[c.status] || ""}`}>{c.status}</span>
              </div>

              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{c.allocatedScratchCards}</span>
                  <span className={styles.statLabel}>Allocated</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{c.usedScratchCards}</span>
                  <span className={styles.statLabel}>Used</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{c.redeemedScratchCards}</span>
                  <span className={styles.statLabel}>Redeemed</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{c.remainingScratchCards}</span>
                  <span className={styles.statLabel}>Remaining</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
