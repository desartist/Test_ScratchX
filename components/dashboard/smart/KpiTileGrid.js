"use client";
import React from "react";
import PropTypes from "prop-types";
import { Store, Megaphone } from "lucide-react";
import styles from "./KpiTileGrid.module.css";

function num(value) {
  return Number.isFinite(value) ? value : 0;
}

export default function KpiTileGrid({ kpi }) {
  if (!kpi) {
    return <div className={styles.empty}>No store data yet.</div>;
  }

  const {
    totalStores,
    activeStores,
    totalCampaigns,
    endingSoon,
  } = kpi;

  return (
    <div className={styles.grid}>
      <div className={styles.tile}>
        <div className={styles.iconWrap}>
          <Store size={18} />
        </div>
        <span className={styles.value}>{num(totalStores)}</span>
        <span className={styles.label}>Stores</span>
        <span className={styles.sub}>
          {num(activeStores)} {num(activeStores) === 1 ? "store" : "stores"} active today
        </span>
      </div>

      <div className={styles.tile}>
        <div className={styles.iconWrap}>
          <Megaphone size={18} />
        </div>
        <span className={styles.value}>{num(totalCampaigns)}</span>
        <span className={styles.label}>Campaigns</span>
        <span className={styles.sub}>{num(endingSoon)} assigns ending soon</span>
      </div>
    </div>
  );
}

KpiTileGrid.propTypes = {
  kpi: PropTypes.shape({
    totalStores: PropTypes.number,
    activeStores: PropTypes.number,
    totalCampaigns: PropTypes.number,
    activeCampaigns: PropTypes.number,
    endingSoon: PropTypes.number,
  }),
};
