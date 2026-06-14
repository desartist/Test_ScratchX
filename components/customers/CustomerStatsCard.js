"use client";
import React from "react";
import styles from "./CustomerStatsCard.module.css";

export default function CustomerStatsCard({ icon, label, value }) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>{icon}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
