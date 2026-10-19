"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { smartCacheService } from "@/lib/smartCacheService";
import CampaignScratchesStep from "./CampaignScratchesStep";
import styles from "./ScratchAllocationModal.module.css";

/**
 * ScratchAllocationModal — the campaign page's Allocate Scratches popup.
 *
 * Renders the same "Set Campaign Scratches" screen as the launch wizard
 * (CampaignScratchesStep): it starts from the campaign's current total and
 * SETS a new one, never below what's used or what quantity-limited coupons
 * reserve, and is fixed at the coupons' total when every coupon has a
 * quantity.
 *
 * Props:
 *   - campaignId: string
 *   - open: boolean
 *   - onClose: () => void
 *   - onAllocated: () => void (called after successful allocation)
 */
export default function ScratchAllocationModal({ campaignId, open, onClose, onAllocated }) {
  const router = useRouter();

  const handleAllocated = useCallback(() => {
    // The step already refreshed this campaign's React Query cache; the
    // campaigns-list page keeps its own separate cache.
    smartCacheService.invalidateRelated({ "campaigns-list": true });
    onAllocated?.();
  }, [onAllocated]);

  // "Review Rewards" on the fixed-total screen → the coupons, to change them.
  const handleReview = useCallback(() => {
    onClose?.();
    router.push(`/campaign/${campaignId}/ranges`);
  }, [onClose, router, campaignId]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Set campaign scratches"
      >
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <CampaignScratchesStep
          campaignId={campaignId}
          enabled={open}
          onAllocated={handleAllocated}
          onCancel={onClose}
          onReview={handleReview}
        />
      </div>
    </div>
  );
}
