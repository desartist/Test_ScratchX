"use client";

import React, { useState } from "react";
import { CheckCircle2, X, AlertCircle, Store, Hourglass } from "lucide-react";
import { useDistributorMerchantsQuery } from "@/hooks/queries/useDistributorMerchantsQuery";
import { useAssignPlanMutation } from "@/hooks/queries/useDistributorNetworkQuery";
import StatCard from "@/components/dashboard/shared/StatCard";
// Reuses Team Access's modal chrome for the "Activate" plan-picker dialog —
// see leads/page.js for the same reuse rationale.
import modalStyles from "@/app/(dashboard)/team/team.module.css";
import styles from "@/components/distributor/distributorList.module.css";
import SkeletonTableRows from "@/components/ui/SkeletonTableRows";

// Retailers onboarded but not yet running on a plan — no subscription set
// means AddBusinessModal created them without granting one at creation time.
export default function RetailerActivationPage() {
  const { data, isPending: loading } = useDistributorMerchantsQuery({ limit: 100 });
  const merchants = data?.merchants || [];
  const pending = merchants.filter((m) => !m.subscription || m.subscription.status !== "active");

  const assignMutation = useAssignPlanMutation();
  const [activatingId, setActivatingId] = useState(null);
  const [planType, setPlanType] = useState("CORE");
  const [error, setError] = useState(null);

  const openActivate = (merchant) => {
    setActivatingId(merchant._id);
    setPlanType("CORE");
    setError(null);
  };

  const handleActivate = async () => {
    setError(null);
    try {
      await assignMutation.mutateAsync({ retailerId: activatingId, planType });
      setActivatingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const activatingMerchant = merchants.find((m) => m._id === activatingId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Retailer Activation</h1>
          <p className={styles.subtitle}>Retailers onboarded but not yet running on a plan</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={<Store />} label="Total Retailers" value={merchants.length} tone="indigo" />
        <StatCard icon={<Hourglass />} label="Awaiting Activation" value={pending.length} tone={pending.length > 0 ? "red" : "green"} />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Retailer</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={5} cols={5} />
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>
                  <CheckCircle2 size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <div>Every retailer in your network is active on a plan.</div>
                </td>
              </tr>
            ) : (
              pending.map((m) => (
                <tr key={m._id}>
                  <td className={styles.leadName}>{m.profile?.storeName || m.name}</td>
                  <td>{m.email}</td>
                  <td>{new Date(m.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td>
                    <span className={styles.statusPill} style={{ borderColor: "#f59e0b" }}>
                      <span className={styles.statusDot} style={{ background: "#f59e0b" }} />
                      No active plan
                    </span>
                  </td>
                  <td>
                    <button type="button" className={styles.addButton} style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => openActivate(m)}>
                      Activate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activatingId && (
        <div className={modalStyles.modalOverlay} onClick={() => setActivatingId(null)}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.modalHeader}>
              <h2 className={modalStyles.modalTitle}>Activate {activatingMerchant?.profile?.storeName || activatingMerchant?.name}</h2>
              <button className={modalStyles.modalClose} onClick={() => setActivatingId(null)}>
                <X size={24} />
              </button>
            </div>
            <div className={modalStyles.modalForm}>
              {error && (
                <div className={modalStyles.formError}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
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
                Grants this retailer 365 days of unlimited scratches from your purchased {planType === "CORE" ? "Core" : "Smart"} license inventory. No commission is recorded for this action.
              </p>
            </div>
            <div className={modalStyles.modalFooter}>
              <button type="button" className={modalStyles.cancelButton} onClick={() => setActivatingId(null)}>Cancel</button>
              <button type="button" className={modalStyles.submitButton} disabled={assignMutation.isPending} onClick={handleActivate}>
                {assignMutation.isPending ? "Activating..." : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
