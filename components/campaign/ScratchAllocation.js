"use client";

import React, { useCallback, useState } from "react";
import { Ticket } from "lucide-react";
import ProgressBar from "@/components/dashboard/ProgressBar";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./ScratchAllocation.module.css";

/**
 * ScratchAllocation
 *
 * Stat tiles + usage progress + allocate input for a campaign's scratches.
 * Writes via POST /api/campaigns/{campaignId}/allocate-scratch
 * body { allocationAmount }.
 *
 * Props:
 *  - campaignId: string
 *  - allocated: number   (campaign.allocated_scratch_cards)
 *  - used: number
 *  - remaining: number
 *  - available: number | "Unlimited"  (subscription entitlement; page-derived)
 *  - onChanged: () => void
 */
export default function ScratchAllocation({
  campaignId,
  allocated = 0,
  used = 0,
  remaining = 0,
  available = 0,
  onChanged,
}) {
  const { account } = useAuthContext();
  const userId = account?.id;
  const userRole = account?.role || "Merchant";

  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isUnlimited = available === "Unlimited";

  const handleAllocate = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);

      const allocationAmount = Number(amount);
      if (!Number.isFinite(allocationAmount) || allocationAmount <= 0) {
        setError("Enter an amount greater than 0.");
        return;
      }

      if (!campaignId || !userId) {
        setError("Authentication required.");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch(
          `/api/campaigns/${campaignId}/allocate-scratch`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": userId,
              "x-user-role": userRole,
            },
            body: JSON.stringify({ allocationAmount }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
          setError(
            data?.error || data?.message || "Failed to allocate scratches.",
          );
          return;
        }
        setAmount("");
        if (typeof onChanged === "function") onChanged();
      } catch (err) {
        console.error("Failed to allocate scratches:", err);
        setError("Failed to allocate scratches.");
      } finally {
        setSaving(false);
      }
    },
    [amount, campaignId, userId, userRole, onChanged],
  );

  const availableDisplay = isUnlimited
    ? "Unlimited"
    : Number(available || 0).toLocaleString();

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Ticket size={20} />
          <h2 className={styles.title}>Scratches Allocation</h2>
        </div>
      </div>

      <p className={styles.note}>
        Allocate scratches to this campaign from your subscription entitlement.
      </p>

      <div className={styles.tileGrid}>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Available</span>
          <span className={styles.tileValue}>{availableDisplay}</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Allocated</span>
          <span className={styles.tileValue}>
            {Number(allocated || 0).toLocaleString()}
          </span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Remaining</span>
          <span className={styles.tileValue}>
            {Number(remaining || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className={styles.usageBlock}>
        <div className={styles.usageHeader}>
          <span className={styles.usageLabel}>Usage</span>
          <span className={styles.usageCount}>
            {Number(used || 0).toLocaleString()} /{" "}
            {Number(allocated || 0).toLocaleString()}
          </span>
        </div>
        <ProgressBar current={used} total={allocated} showLabel={false} />
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <form className={styles.allocateRow} onSubmit={handleAllocate}>
        <input
          type="number"
          className={styles.input}
          placeholder="Scratches to allocate"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
        />
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={saving}
        >
          {saving ? "Allocating…" : "Allocate"}
        </button>
      </form>
    </section>
  );
}
