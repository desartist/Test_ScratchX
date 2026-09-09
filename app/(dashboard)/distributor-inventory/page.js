"use client";

import React from "react";
import Link from "next/link";
import { Package, Zap, ShoppingCart } from "lucide-react";
import { useDistributorInventoryQuery } from "@/hooks/queries/useDistributorNetworkQuery";
import StatCard from "@/components/dashboard/shared/StatCard";
import styles from "@/components/distributor/distributorList.module.css";
import invStyles from "./distributorInventory.module.css";

// Named "Scratch Inventory" in the sidebar to match the merchant-facing
// vocabulary, but what a Distributor actually holds is license inventory
// (CORE/SMART) — each license, once assigned, grants the retailer 365 days
// of unlimited scratches. See lib/services/distributor/inventoryService.js,
// already the single source of truth used by the dashboard and marketplace.
export default function DistributorInventoryPage() {
  const { data: inventory, isPending: loading } = useDistributorInventoryQuery();
  const core = inventory?.plans?.CORE || { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0 };
  const smart = inventory?.plans?.SMART || { totalPurchased: 0, totalAssigned: 0, totalRemaining: 0 };
  const totalRemaining = core.totalRemaining + smart.totalRemaining;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Scratch Inventory</h1>
          <p className={styles.subtitle}>Your purchased license inventory — each license grants a retailer 365 days of unlimited scratches</p>
        </div>
        <Link href="/marketplace" className={styles.addButton}>
          <ShoppingCart size={18} />
          Buy More
        </Link>
      </div>

      {loading ? (
        <p className={styles.emptyCell}>Loading...</p>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <StatCard icon={<Package />} label="Total Remaining" value={totalRemaining} tone="indigo" />
            <StatCard icon={<Package />} label="Core Remaining" value={core.totalRemaining} tone={core.totalRemaining > 0 ? "green" : "red"} />
            <StatCard icon={<Zap />} label="Smart Remaining" value={smart.totalRemaining} tone={smart.totalRemaining > 0 ? "green" : "red"} />
          </div>

          <div className={invStyles.planGrid}>
            <div className={invStyles.planCard}>
              <div className={invStyles.planHeader}>
                <div className={`${invStyles.planIcon} ${invStyles.planIconBlue}`}>
                  <Package size={20} />
                </div>
                <h2 className={invStyles.planTitle}>Core License</h2>
              </div>
              <div className={invStyles.planStatsRow}>
                <div><span className={invStyles.planStatValue}>{core.totalPurchased}</span><span className={invStyles.planStatLabel}>Purchased</span></div>
                <div><span className={invStyles.planStatValue}>{core.totalAssigned}</span><span className={invStyles.planStatLabel}>Assigned</span></div>
                <div><span className={invStyles.planStatValue}>{core.totalRemaining}</span><span className={invStyles.planStatLabel}>Remaining</span></div>
              </div>
              <div className={invStyles.utilizationBar}>
                <div className={invStyles.utilizationFill} style={{ width: `${core.percentageUtilized || 0}%`, background: "#6d5df6" }} />
              </div>
              <p className={invStyles.utilizationLabel}>{core.percentageUtilized || 0}% utilized</p>
            </div>

            <div className={invStyles.planCard}>
              <div className={invStyles.planHeader}>
                <div className={`${invStyles.planIcon} ${invStyles.planIconOrange}`}>
                  <Zap size={20} />
                </div>
                <h2 className={invStyles.planTitle}>Smart License</h2>
              </div>
              <div className={invStyles.planStatsRow}>
                <div><span className={invStyles.planStatValue}>{smart.totalPurchased}</span><span className={invStyles.planStatLabel}>Purchased</span></div>
                <div><span className={invStyles.planStatValue}>{smart.totalAssigned}</span><span className={invStyles.planStatLabel}>Assigned</span></div>
                <div><span className={invStyles.planStatValue}>{smart.totalRemaining}</span><span className={invStyles.planStatLabel}>Remaining</span></div>
              </div>
              <div className={invStyles.utilizationBar}>
                <div className={invStyles.utilizationFill} style={{ width: `${smart.percentageUtilized || 0}%`, background: "#ef9e1b" }} />
              </div>
              <p className={invStyles.utilizationLabel}>{smart.percentageUtilized || 0}% utilized</p>
            </div>
          </div>

          {totalRemaining === 0 && core.totalPurchased === 0 && smart.totalPurchased === 0 && (
            <div className={styles.emptyCell}>
              You haven&apos;t purchased any licenses yet.{" "}
              <Link href="/marketplace" style={{ color: "#ef9e1b", fontWeight: 700 }}>Visit the marketplace</Link> to get started.
            </div>
          )}
        </>
      )}
    </div>
  );
}
