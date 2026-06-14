"use client";

import React from "react";
import { Eye, Edit2, Copy, Pause, ArrowUpRight } from "lucide-react";
import styles from "./CampaignPerformance.module.css";

export default function CampaignPerformance({ campaigns, isSingleStore }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>Active Campaigns</h3>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎯</div>
          <p className={styles.emptyText}>No campaigns yet</p>
          <p className={styles.emptySubtext}>
            Create your first campaign to get started
          </p>
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns
    .filter((c) => c.status === "active")
    .slice(0, isSingleStore ? 5 : 3);

  if (activeCampaigns.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>Campaign Performance</h3>
        <div className={styles.empty}>
          <p className={styles.emptyText}>No active campaigns</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.title}>Campaign Performance</h3>
        <a href="/campaign" className={styles.viewAll}>
          View all
        </a>
      </div>

      <div className={styles.grid}>
        {activeCampaigns.map((campaign) => (
          <div key={campaign._id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h4 className={styles.campaignName}>{campaign.name}</h4>
                <p className={styles.billingRange}>₹ {campaign.billingRange}</p>
              </div>
              <span className={`${styles.badge} ${styles[`status-${campaign.status}`]}`}>
                {campaign.status === "active" ? "Active" : "Ended"}
              </span>
            </div>

            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span className={styles.label}>Allocated Cards</span>
                <span className={styles.value}>
                  {campaign.allocatedCards.toLocaleString()}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Remaining</span>
                <span className={styles.value}>
                  {campaign.remainingCards.toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.progress}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${
                      campaign.allocatedCards > 0
                        ? Math.round(
                            ((campaign.allocatedCards -
                              campaign.remainingCards) /
                              campaign.allocatedCards) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Scans</span>
                <span className={styles.statValue}>
                  {campaign.totalScans.toLocaleString()}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Participants</span>
                <span className={styles.statValue}>
                  {campaign.participants.toLocaleString()}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Claims</span>
                <span className={styles.statValue}>
                  {campaign.claimedCoupons.toLocaleString()}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Conversion</span>
                <span className={styles.statValue}>{campaign.conversionRate}%</span>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.actionBtn} title="View">
                <Eye size={16} />
              </button>
              <button className={styles.actionBtn} title="Edit">
                <Edit2 size={16} />
              </button>
              <button className={styles.actionBtn} title="Clone">
                <Copy size={16} />
              </button>
              <button className={styles.actionBtn} title="Pause">
                <Pause size={16} />
              </button>
            </div>

            {campaign.conversionRate > 75 && (
              <div className={styles.trending}>
                <ArrowUpRight size={14} />
                High Performance
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
