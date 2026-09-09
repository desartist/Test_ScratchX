"use client";

import React from "react";
import { UserPlus, CreditCard, Megaphone, Activity } from "lucide-react";
import { useRetailerActivityQuery } from "@/hooks/queries/useDistributorNetworkQuery";
import styles from "@/components/distributor/distributorList.module.css";
import feedStyles from "./retailerActivity.module.css";

const EVENT_ICON = {
  retailer_added: UserPlus,
  plan_granted: CreditCard,
  campaign_created: Megaphone,
};

const EVENT_COLOR = {
  retailer_added: "#6d5df6",
  plan_granted: "#10b981",
  campaign_created: "#ef9e1b",
};

function formatWhen(value) {
  const d = new Date(value);
  const now = new Date();
  const diffMins = Math.floor((now - d) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function RetailerActivityPage() {
  const { data: events = [], isPending: loading } = useRetailerActivityQuery();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Retailer Activity</h1>
          <p className={styles.subtitle}>Recent events across your retailer network</p>
        </div>
      </div>

      <div className={feedStyles.feedCard}>
        {loading ? (
          <p className={styles.emptyCell}>Loading...</p>
        ) : events.length === 0 ? (
          <div className={styles.emptyCell}>
            <Activity size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div>No activity yet — it&apos;ll show up here as retailers join, get activated, and launch campaigns.</div>
          </div>
        ) : (
          <div className={feedStyles.feed}>
            {events.map((e, i) => {
              const Icon = EVENT_ICON[e.type] || Activity;
              const color = EVENT_COLOR[e.type] || "#6b7280";
              return (
                <div key={i} className={feedStyles.feedItem}>
                  <div className={feedStyles.feedIcon} style={{ background: `${color}1a`, color }}>
                    <Icon size={16} />
                  </div>
                  <div className={feedStyles.feedBody}>
                    <span className={feedStyles.feedLabel}>{e.label}</span>
                    <span className={feedStyles.feedTime}>{formatWhen(e.at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
