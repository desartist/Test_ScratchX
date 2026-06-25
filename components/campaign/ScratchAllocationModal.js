"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X, Ticket, AlertCircle } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { smartCacheService } from "@/lib/smartCacheService";
import styles from "./ScratchAllocationModal.module.css";

const QUICK_SELECT_CHIPS = [
  { label: "1,000", value: 1000 },
  { label: "2,000", value: 2000 },
  { label: "4,000", value: 4000 },
  { label: "5,000", value: 5000 },
  { label: "No Cap", value: 1000000 },
];

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
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState(null);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userId || "",
      "x-user-role": userRole,
    }),
    [userId, userRole]
  );

  // Load subscription status when modal opens
  useEffect(() => {
    if (!open) return;
    let active = true;

    setAllocation(DEFAULT_ALLOCATION);
    setCustomAmount("");
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/subscription/status", {
          credentials: "include",
          headers,
        });
        const data = await res.json().catch(() => ({}));
        if (active) setSubscription(data?.success ? data : null);
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
        if (active) setSubscription(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, headers]);

  const handleSelectChip = useCallback((value) => {
    setAllocation(value);
    setCustomAmount("");
  }, []);

  const handleCustomChange = useCallback((e) => {
    const value = e.target.value;
    setCustomAmount(value);
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

      // Success - clear related caches to reflect updated allocations
      smartCacheService.invalidateRelated({
        'campaigns-list': true,
        [`campaign-detail-${campaignId}`]: true,
      });

      if (typeof onAllocated === "function") {
        onAllocated();
      }
    } catch (err) {
      console.error("Failed to allocate scratches:", err);
      setError("Failed to allocate scratches");
    } finally {
      setAllocating(false);
    }
  }, [campaignId, userId, allocation, headers, onAllocated]);

  const isUnlimited = subscription?.unlimitedScratches === true ||
                      subscription?.scratchRemaining === "UNLIMITED";
  const scratchRemaining = isUnlimited ? "Unlimited" : (subscription?.scratchRemaining || 0);

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
              <p className={styles.subtitle}>Choose how many scratches to allocate</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingState}>Loading subscription...</div>
          ) : (
            <>
              {/* Subscription Info */}
              <div className={styles.subscriptionInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Your Entitlement</span>
                  <span className={styles.infoValue}>
                    {isUnlimited ? "∞ Unlimited" : `${scratchRemaining} Scratches`}
                  </span>
                </div>
              </div>

              {/* Quick Select Chips */}
              <div className={styles.section}>
                <label className={styles.label}>Quick Select</label>
                <div className={styles.chipsContainer}>
                  {QUICK_SELECT_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      className={`${styles.chip} ${allocation === chip.value ? styles.chipActive : ""}`}
                      onClick={() => handleSelectChip(chip.value)}
                    >
                      {chip.label}
                    </button>
                  ))}
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
                <span className={styles.selectedLabel}>Allocation Amount:</span>
                <span className={styles.selectedValue}>
                  {allocation === 1000000 ? "No Cap (∞)" : allocation.toLocaleString()}
                </span>
              </div>

              {/* Info Message */}
              {isUnlimited && (
                <div className={styles.infoBox}>
                  <AlertCircle size={16} />
                  <span>You have unlimited scratches. This allocation is informational only.</span>
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
            disabled={allocating || !allocation || loading}
          >
            {allocating ? "Allocating..." : "Confirm & Allocate"}
          </button>
        </div>
      </div>
    </div>
  );
}
