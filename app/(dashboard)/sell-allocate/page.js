"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Package, Zap } from "lucide-react";
import { useDistributorMerchantsQuery } from "@/hooks/queries/useDistributorMerchantsQuery";
import { useDistributorInventoryQuery, useAssignPlanMutation } from "@/hooks/queries/useDistributorNetworkQuery";
import StatCard from "@/components/dashboard/shared/StatCard";
import modalStyles from "@/app/(dashboard)/team/team.module.css";
import styles from "@/components/distributor/distributorList.module.css";

// Sell / Allocate a license from your purchased inventory to any retailer
// in your network — the same underlying grant used by Retailer Activation,
// just reachable directly rather than only from the "not yet active" queue
// (e.g. to top someone up after their previous plan lapsed).
export default function SellAllocatePage() {
  const { data: merchantsData, isPending: merchantsLoading } = useDistributorMerchantsQuery({ limit: 100 });
  const merchants = merchantsData?.merchants || [];
  const { data: inventory } = useDistributorInventoryQuery();
  const assignMutation = useAssignPlanMutation();

  const [retailerId, setRetailerId] = useState("");
  const [planType, setPlanType] = useState("CORE");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const core = inventory?.plans?.CORE || { totalRemaining: 0 };
  const smart = inventory?.plans?.SMART || { totalRemaining: 0 };
  const remainingForSelected = planType === "CORE" ? core.totalRemaining : smart.totalRemaining;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!retailerId) {
      setError("Select a retailer");
      return;
    }
    try {
      await assignMutation.mutateAsync({ retailerId, planType });
      const retailer = merchants.find((m) => m._id === retailerId);
      setSuccess(`${planType === "CORE" ? "Core" : "Smart"} plan granted to ${retailer?.profile?.storeName || retailer?.name}.`);
      setRetailerId("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Sell / Allocate</h1>
          <p className={styles.subtitle}>Grant a license from your purchased inventory to a retailer</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={<Package />} label="Core Remaining" value={core.totalRemaining} tone={core.totalRemaining > 0 ? "green" : "red"} />
        <StatCard icon={<Zap />} label="Smart Remaining" value={smart.totalRemaining} tone={smart.totalRemaining > 0 ? "green" : "red"} />
      </div>

      <div className={styles.filtersSection}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div className={modalStyles.formError}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669", fontSize: 14, fontWeight: 600 }}>
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>Retailer</label>
            <select
              className={modalStyles.formInput}
              value={retailerId}
              onChange={(e) => setRetailerId(e.target.value)}
              disabled={merchantsLoading}
            >
              <option value="">Select a retailer...</option>
              {merchants.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.profile?.storeName || m.name} {m.subscription?.status === "active" ? "(currently active)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>Plan</label>
            <div className={modalStyles.roleOptionsRow}>
              {["CORE", "SMART"].map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`${modalStyles.roleOption} ${planType === p ? modalStyles.roleOptionActive : ""}`}
                  onClick={() => setPlanType(p)}
                >
                  {p === "CORE" ? "Core" : "Smart"}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#637080" }}>
            {remainingForSelected} {planType === "CORE" ? "Core" : "Smart"} license{remainingForSelected === 1 ? "" : "s"} remaining in your inventory.
            {" "}Granting replaces any existing subscription check — a retailer already on an active plan can&apos;t be re-granted until it lapses.
          </p>

          <button
            type="submit"
            className={modalStyles.submitButton}
            style={{ alignSelf: "flex-start" }}
            disabled={assignMutation.isPending || remainingForSelected === 0}
          >
            {assignMutation.isPending ? "Granting..." : "Grant Plan"}
          </button>
        </form>
      </div>
    </div>
  );
}
