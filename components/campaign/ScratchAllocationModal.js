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

  // The campaign's NEW TOTAL allocation (this popup sets it, it doesn't add
  // to it — see handleAllocate). 0 means "nothing chosen yet".
  const [allocation, setAllocation] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  // Which input the value came from. Chips only show as selected while in
  // "chip" mode, so focusing the custom field clears them.
  const [inputMode, setInputMode] = useState("chip");
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
  // to show what's already allocated and used. This popup SETS the total, so
  // the chosen value replaces currentAllocated rather than adding to it.
  const { data: campaignJson, isPending: campaignLoading } = useCampaignQuery(campaignId, { enabled: open });
  const currentAllocated = Number(campaignJson?.data?.allocated_scratch_cards) || 0;
  // Scratches customers already consumed — the allocation can't go below
  // this. used and redeemed are separate buckets, so both count (matches the
  // floor in /api/campaigns/[id]/allocate-scratch).
  const used =
    (Number(campaignJson?.data?.used_scratch_cards) || 0) +
    (Number(campaignJson?.data?.redeemed_scratch_cards) || 0);

  const loading = subLoading || campaignLoading;
  const invalidateCluster = useInvalidateCampaignCluster();

  // Reset transient form state whenever the modal opens.
  //
  // Nothing is pre-selected for a campaign that already has an allocation.
  // Pre-selecting 2,000 was fine while this popup ADDED scratches, but now
  // that it sets the total, a quick tap on Confirm would silently cut e.g.
  // 13,100 down to 2,000. A brand-new campaign still defaults to 2,000.
  useEffect(() => {
    if (!open || loading) return;
    setAllocation(currentAllocated > 0 ? 0 : DEFAULT_ALLOCATION);
    setCustomAmount("");
    setInputMode("chip");
    setIsNoCapSelected(false);
    setError(null);
    // Only on open / once data arrives — not whenever currentAllocated moves
    // after a refetch, which would wipe what the merchant has chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading]);

  const handleSelectChip = useCallback((value) => {
    setCustomAmount("");
    setInputMode("chip");
    setError(null);

    if (value === NO_CAP_SENTINEL) {
      setIsNoCapSelected(true);
      // During the unlimited grant the server skips the balance check, so the
      // sentinel is a safe "effectively unlimited" total. A pack-based
      // merchant can only raise the total by their remaining balance, so
      // "No Cap" means "everything I have": today's total + what's left.
      const remaining = subscription?.scratchRemaining;
      const isUnlimitedEntitlement =
        subscription?.unlimitedScratches === true || remaining === "UNLIMITED";
      setAllocation(
        isUnlimitedEntitlement
          ? Math.max(NO_CAP_SENTINEL, currentAllocated)
          : currentAllocated + (Number(remaining) || 0),
      );
      return;
    }

    setIsNoCapSelected(false);
    setAllocation(value);
  }, [subscription, currentAllocated]);

  // Focusing the custom field deselects the quick chips — the value now comes
  // from what's typed (nothing, until they type).
  const handleCustomFocus = useCallback(() => {
    if (inputMode === "custom") return;
    setInputMode("custom");
    setIsNoCapSelected(false);
    setError(null);
    const n = Math.floor(Number(customAmount));
    setAllocation(customAmount !== "" && n > 0 ? n : 0);
  }, [inputMode, customAmount]);

  const handleCustomChange = useCallback((e) => {
    const value = e.target.value;
    setCustomAmount(value);
    setInputMode("custom");
    setIsNoCapSelected(false);
    setError(null);
    // Clearing the field must clear the amount too — it used to keep the last
    // number typed, so an empty box could still submit a stale value.
    const n = Math.floor(Number(value));
    setAllocation(value !== "" && Number.isFinite(n) && n > 0 ? n : 0);
  }, []);

  const isUnchanged = currentAllocated > 0 && allocation === currentAllocated;
  const isBelowUsed = allocation > 0 && allocation < used;

  const handleAllocate = useCallback(async () => {
    if (!campaignId || !userId || !allocation) {
      setError("Invalid allocation amount");
      return;
    }
    if (allocation < used) {
      setError(`${used.toLocaleString()} scratches are already used on this campaign — the total can't go below that.`);
      return;
    }

    setAllocating(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/allocate-scratch`, {
        method: "POST",
        credentials: "include",
        headers,
        // targetTotal = SET the campaign's allocation to this exact total,
        // rather than adding it on top of what's already there.
        body: JSON.stringify({ targetTotal: allocation }),
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
  }, [campaignId, userId, allocation, used, headers, onAllocated, invalidateCluster]);

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
                  ? `Currently ${currentAllocated.toLocaleString()} allocated${used > 0 ? ` · ${used.toLocaleString()} used` : ""} — choose the new total`
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
                    // Chips are only ever "selected" while the value came from
                    // a chip — typing a matching number in the custom field
                    // doesn't light one up.
                    const isActive =
                      inputMode === "chip" &&
                      (chip.value === NO_CAP_SENTINEL
                        ? isNoCapSelected
                        : !isNoCapSelected && allocation === chip.value);
                    // Can't set a total below what customers already used.
                    const isBelowFloor = chip.value !== NO_CAP_SENTINEL && chip.value < used;
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
                        onClick={() => handleSelectChip(chip.value)}
                        disabled={isBelowFloor}
                        aria-pressed={isActive}
                        title={isBelowFloor ? `${used.toLocaleString()} already used` : undefined}
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
                  inputMode="numeric"
                  placeholder={currentAllocated > 0 ? "Enter new total" : "Enter custom amount"}
                  value={customAmount}
                  onFocus={handleCustomFocus}
                  onChange={handleCustomChange}
                  className={styles.input}
                  min={Math.max(1, used)}
                  step="1"
                />
              </div>

              {/* Selected Amount Display */}
              <div className={styles.selectedAmount}>
                <span className={styles.selectedLabel}>
                  {currentAllocated > 0 ? "New total:" : "Allocation Amount:"}
                </span>
                <span className={styles.selectedValue}>
                  {isNoCapSelected ? "No Cap (∞)" : allocation > 0 ? allocation.toLocaleString() : "—"}
                </span>
              </div>
              {/* Explains why Update Allocation is disabled. */}
              {isUnchanged && !isNoCapSelected && (
                <p className={styles.deltaHint}>
                  Same as the current allocation — no change.
                </p>
              )}
              {isBelowUsed && (
                <div className={styles.errorBox}>
                  <AlertCircle size={16} />
                  <span>
                    {used.toLocaleString()} scratches are already used — the total can&apos;t go below that.
                  </span>
                </div>
              )}

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
            disabled={allocating || !allocation || loading || isUnchanged || isBelowUsed}
          >
            {allocating
              ? "Saving..."
              : currentAllocated > 0
                ? "Update Allocation"
                : "Confirm & Allocate"}
          </button>
        </div>
      </div>
    </div>
  );
}
