// components/dashboard/MetricChip.js
"use client";
import React from "react";
import { Calendar, MapPin } from "lucide-react";
import styles from "./MetricChip.module.css";

const ICON_MAP = {
  days: Calendar,
  stores: MapPin,
};

export default function MetricChip({ type = "days", label = "", value = "" }) {
  const IconComponent = ICON_MAP[type];

  return (
    <div className={styles.chip}>
      {IconComponent && <IconComponent size={16} className={styles.icon} />}
      <span className={styles.label}>{label}</span>
      {value && <span className={styles.value}>{value}</span>}
    </div>
  );
}
