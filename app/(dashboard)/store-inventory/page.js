"use client";

import React from "react";
import { AlertCircle, Package } from "lucide-react";
import { useStoreInventoryQuery } from "@/hooks/queries/useStoreInventoryQuery";
import LoadingState from "@/components/common/LoadingState";
import styles from "./store-inventory.module.css";
import Skeleton from "@/components/ui/Skeleton";
import { SkeletonCardList } from "@/components/ui/SkeletonCard";

export default function StoreInventoryPage() {
  const { data, isPending: loading, error: queryError } = useStoreInventoryQuery();
  const error = queryError ? queryError.message : null;


  if (!loading && (error || !data)) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{error || "Unable to load inventory."}</p>
        </div>
      </div>
    );
  }

  // Card frames and labels render immediately; these zeroed defaults back the
  // shimmering values until the request lands.
  const { inventory, campaignAllocations } = data || {
    inventory: { total: 0, allocated: 0, used: 0, redeemed: 0, utilizationPercentage: 0 },
    campaignAllocations: [],
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Inventory</h1>
        <p className={styles.pageSubtitle}>Scratch card allocation status for your store</p>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{loading ? <Skeleton w="3ch" h="0.8em" /> : inventory.total}</span>
          <span className={styles.summaryLabel}>Store Total</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{loading ? <Skeleton w="3ch" h="0.8em" /> : inventory.allocated}</span>
          <span className={styles.summaryLabel}>Allocated</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{loading ? <Skeleton w="3ch" h="0.8em" /> : inventory.used + inventory.redeemed}</span>
          <span className={styles.summaryLabel}>Used / Redeemed</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{loading ? <Skeleton w="3ch" h="0.8em" /> : inventory.unallocated}</span>
          <span className={styles.summaryLabel}>Unallocated</span>
        </div>
      </div>

      <div className={styles.utilizationBar}>
        <div className={styles.utilizationFill} style={{ width: `${Math.min(inventory.utilizationPercentage, 100)}%` }} />
      </div>
      <p className={styles.utilizationLabel}>{loading ? <Skeleton w="3ch" h="0.8em" /> : inventory.utilizationPercentage}% utilized</p>

      <h2 className={styles.sectionTitle}>By Campaign</h2>
      {loading ? (
        <SkeletonCardList count={3} lines={2} />
      ) : campaignAllocations.length === 0 ? (
        <div className={styles.emptyState}>
          <Package size={40} />
          <p>No campaigns are allocated to your store yet.</p>
        </div>
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div>Campaign</div>
            <div>Allocated</div>
            <div>Used</div>
            <div>Redeemed</div>
            <div>Remaining</div>
          </div>
          {campaignAllocations.map((c) => (
            <div key={c.campaignId} className={styles.tableRow}>
              <div className={styles.campaignCell}>
                {c.campaignName}
                <span className={`${styles.statusBadge} ${styles[c.status] || ""}`}>{c.status}</span>
              </div>
              <div>{c.allocated}</div>
              <div>{c.used}</div>
              <div>{c.redeemed}</div>
              <div>{c.remaining}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
