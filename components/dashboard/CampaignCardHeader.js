// components/dashboard/CampaignCardHeader.js
"use client";
import React from "react";
import StatusBadge from "./StatusBadge";
import styles from "./CampaignCardHeader.module.css";

export default function CampaignCardHeader({
  name = "Campaign Name",
  startDate = "",
  endDate = "",
  status = "active",
}) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <h3 className={styles.title}>{name}</h3>
        <div className={styles.dates}>
          <span className={styles.date}>{formatDate(startDate)}</span>
          <span className={styles.separator}>–</span>
          <span className={styles.date}>{formatDate(endDate)}</span>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}
