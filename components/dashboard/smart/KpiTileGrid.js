"use client";
import React from "react";
import PropTypes from "prop-types";
import { Store, Megaphone } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import styles from "./KpiTileGrid.module.css";

function num(value) {
  return Number.isFinite(value) ? value : 0;
}

export default function KpiTileGrid({ kpi, loading = false }) {
  // While the numbers are in flight the tiles still render — icons, titles and
  // layout are static markup, only the counts shimmer. Showing the "no data"
  // empty state here would claim the merchant has no stores before we know.
  if (!loading && !kpi) {
    return <div className={styles.empty}>No store data yet.</div>;
  }

  const {
    totalStores,
    activeStores,
    totalCampaigns,
    endingSoon,
  } = kpi || {};

  return (
    <div className={styles.grid}>
      <div className={styles.tile}>
        <div className={styles.iconWrap}>
          <Store size={18} />
        </div>
        <span className={styles.value}>
          {loading ? <Skeleton w="1.5ch" h="0.8em" /> : num(totalStores)}
        </span>
        <span className={styles.label}>Stores</span>
        <span className={styles.sub}>
          {loading ? (
            <Skeleton w="12ch" />
          ) : (
            `${num(activeStores)} ${num(activeStores) === 1 ? "store" : "stores"} active today`
          )}
        </span>
      </div>

      <div className={styles.tile}>
        <div className={styles.iconWrap}>
          <Megaphone size={18} />
        </div>
        <span className={styles.value}>
          {loading ? <Skeleton w="1.5ch" h="0.8em" /> : num(totalCampaigns)}
        </span>
        <span className={styles.label}>Campaigns</span>
        <span className={styles.sub}>
          {loading ? <Skeleton w="14ch" /> : `${num(endingSoon)} assigns ending soon`}
        </span>
      </div>
    </div>
  );
}

KpiTileGrid.propTypes = {
  loading: PropTypes.bool,
  kpi: PropTypes.shape({
    totalStores: PropTypes.number,
    activeStores: PropTypes.number,
    totalCampaigns: PropTypes.number,
    activeCampaigns: PropTypes.number,
    endingSoon: PropTypes.number,
  }),
};
