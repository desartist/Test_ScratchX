"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X, Ticket, AlertCircle } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useCampaignQuery, useInvalidateCampaignCluster } from "@/hooks/queries/useCampaignQuery";
import { useSubscriptionStatusQuery } from "@/hooks/queries/useSubscriptionQuery";
import { smartCacheService } from "@/lib/smartCacheService";
import styles from "./ScratchAllocationModal.module.css";

const QUICK_SELECT_CHIPS = [
  { label: "1,000", value: 1000 },
  { label: "2,000", value: 2000 },
  { label: "4,000", value: 4000 },
  { label: "5,000", value: 5000 },
  { label: "No Cap", value: 1000000 },
];

// "No Cap" is a placeholder chip, not a real value — see handleSelectChip,
// which swaps it out for either this sentinel (only safe while the merchant's
// unlimited-scratches grant is active, since the server skips the balance
// check entirely in that case) or their real remaining pack balance.
const NO_CAP_SENTINEL = 1000000;

const DEFAULT_ALLOCATION = 2000;

/**
 * ScratchAllocationModal
 *
 * Simple modal for allocating scratches to a campaign.
 * Only focuses on scratch allocation, no stores or QR steps.
 *
 * Props:
 *   - campaignId: string
 *   - open: boolean
 *   - onClose: () => void
 *   - onAllocated: () => void (called after successful allocation)
 */
export default function ScratchAllocationModal({
  campaignId,
  open,
  onClose,
  onAllocated,
}) {
  const { account } = useAuthContext();
  const userId = account?.id || account?._id;
  const userRole = account?.role || "Merchant";

  const [allocation, setAllocation] = useState(DEFAULT_ALLOCATION);
  const [customAmount, setCustomAmount] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState(null);
  // Tracks the "No Cap" chip separately from `allocation` itself, since the
  // number actually submitted for it varies by entitlement (see
  // handleSelectChip) and isn't always the sentinel value below.
  const [isNoCapSelected, setIsNoCapSelected] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userId || "",
      "x-user-role": userRole,
    }),
    [userId, userRole]
  );

  // Shares the same cached subscription-status response as stores/page.js,
  // campaign/[id]/page.js, and LaunchWizardModal.js — only enabled while
  // open. The entitlement box itself is no longer shown in this modal
  // (removed per product decision), but the data is still needed to resolve
  // what "No Cap" should actually submit — see handleSelectChip.
  const { data: subscription, isPending: subLoading } = useSubscriptionStatusQuery({ enabled: open });

  // Shares the same cached response as campaign/[id]/page.js — needed here
  // to show what's already allocated, since allocate-scratch is additive
  // (it tops up the existing total, it doesn't replace it).
  const { data: campaignJson, isPending: campaignLoading } = useCampaignQuery(campaignId, { enabled: open });
  const currentAllocated = Number(campaignJson?.data?.allocated_scratch_cards) || 0;

  const loading = subLoading || campaignLoading;
  const invalidateCluster = useInvalidateCampaignCluster();

  // Reset transient form state whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setAllocation(DEFAULT_ALLOCATION);
    setCustomAmount("");
    setIsNoCapSelected(false);
    setError(null);
  }, [open]);

  const handleSelectChip = useCallback((value) => {
    setCustomAmount("");

    if (value === NO_CAP_SENTINEL) {
      setIsNoCapSelected(true);
      // The server only skips the balance check while the unlimited grant
      // is active — for a pack-based merchant it would instead compare the
      // sentinel against their real balance and reject it as "insufficient
      // scratches". Submit their actual remaining balance in that case, so
      // "No Cap" reads as "everything I have" rather than a fixed number
      // that's almost never actually available.
      const remaining = subscription?.scratchRemaining;
      const isUnlimitedEntitlement =
        subscription?.unlimitedScratches === true || remaining === "UNLIMITED";
      setAllocation(isUnlimitedEntitlement ? NO_CAP_SENTINEL : Number(remaining) || 0);
      return;
    }

    setIsNoCapSelected(false);
    setAllocation(value);
  }, [subscription]);

  const handleCustomChange = useCallback((e) => {
    const value = e.target.value;
    setCustomAmount(value);
    setIsNoCapSelected(false);
    if (value && !isNaN(value)) {
      setAllocation(Number(value));
    }
  }, []);

  const handleAllocate = useCallback(async () => {
    if (!campaignId || !userId || !allocation) {
      setError("Invalid allocation amount");
      return;
    }

    setAllocating(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/allocate-scratch`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ allocationAmount: allocation }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        setError(data?.error || data?.message || "Failed to allocate scratches");
        return;
      }

      // Clear the campaign's own React Query cache (campaign/[id]/page.js and
      // its children) plus the campaigns-list page's separate cache system.
      invalidateCluster(campaignId);
      smartCacheService.invalidateRelated({ 'campaigns-list': true });

      if (typeof onAllocated === "function") {
        onAllocated();
      }
    } catch (err) {
      console.error("Failed to allocate scratches:", err);
      setError("Failed to allocate scratches");
    } finally {
      setAllocating(false);
    }
  }, [campaignId, userId, allocation, headers, onAllocated, invalidateCluster]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Ticket size={24} className={styles.icon} />
            <div>
              <h2 className={styles.title}>Allocate Scratches</h2>
              <p className={styles.subtitle}>
                {currentAllocated > 0
                  ? `Add more scratches — ${currentAllocated.toLocaleString()} already allocated`
                  : "Choose how many scratches to allocate"}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingState}>Loading...</div>
          ) : (
            <>
              {/* Quick Select Chips */}
              <div className={styles.section}>
                <label className={styles.label}>Quick Select</label>
                <div className={styles.chipsContainer}>
                  {QUICK_SELECT_CHIPS.map((chip) => {
                    const isActive =
                      chip.value === NO_CAP_SENTINEL
                        ? isNoCapSelected
                        : !isNoCapSelected && allocation === chip.value;
                    return (
                      <button
                        key={chip.value}
                        className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
                        onClick={() => handleSelectChip(chip.value)}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount */}
              <div className={styles.section}>
                <label htmlFor="customAmount" className={styles.label}>
                  Or Enter Custom Amount
                </label>
                <input
                  id="customAmount"
                  type="number"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={handleCustomChange}
                  className={styles.input}
                  min="1"
                />
              </div>

              {/* Selected Amount Display */}
              <div className={styles.selectedAmount}>
                <span className={styles.selectedLabel}>
                  {currentAllocated > 0 ? "Adding:" : "Allocation Amount:"}
                </span>
                <span className={styles.selectedValue}>
                  {isNoCapSelected ? "No Cap (∞)" : allocation.toLocaleString()}
                </span>
              </div>

              {/* Error Message */}
              {error && (
                <div className={styles.errorBox}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.secondaryBtn} onClick={onClose} disabled={allocating}>
            Cancel
          </button>
          <button
            className={styles.primaryBtn}
            onClick={handleAllocate}
            disabled={allocating || !allocation || loading}
          >
            {allocating
              ? "Allocating..."
              : currentAllocated > 0
                ? "Confirm & Add"
                : "Confirm & Allocate"}
          </button>
        </div>
      </div>
    </div>
  );
}
