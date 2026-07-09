"use client";

import React, { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Tag, Pencil, Plus, QrCode } from "lucide-react";
import {
  campaignRangesQueryKey,
  useCampaignQuery,
  useCampaignRangesQuery,
  useInvalidateCampaignCluster,
} from "@/hooks/queries/useCampaignQuery";
import RangeWizard from "@/components/campaign/RangeWizard";
import LaunchWizardModal from "@/components/campaign/LaunchWizardModal";
import styles from "./ranges.module.css";

/**
 * Step 2 of campaign setup — "Setup Billing Range".
 *
 * LISTING state: shows each existing range as a clickable row (opens the
 * editor) plus an "Add Billing Range" ghost row (opens the editor in create
 * mode) and a "Preview & Launch" button (-> campaign details).
 * EDITOR state: renders <RangeWizard> for create OR edit; on done, returns
 * to the listing and refetches.
 */
export default function CampaignRangesStepPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id;

  // Shares the same cached responses as campaign/[id]/page.js and
  // RewardRanges.js instead of firing its own requests.
  const { data: rangesJson, isPending: loading, error: rangesError } = useCampaignRangesQuery(campaignId);
  const ranges = rangesJson?.ranges || [];
  const error = rangesError ? rangesError.message || "Failed to load reward ranges" : null;

  const { data: campaignJson } = useCampaignQuery(campaignId);
  const campaign = campaignJson?.data || null;

  const queryClient = useQueryClient();
  const invalidateCluster = useInvalidateCampaignCluster();

  // mode: 'list' | 'edit'. editRange null => create.
  const [mode, setMode] = useState("list");
  const [editRange, setEditRange] = useState(null);

  // Launch wizard modal (allocate scratches -> assign stores -> QR).
  const [launchOpen, setLaunchOpen] = useState(false);

  const openCreate = useCallback(() => {
    setEditRange(null);
    setMode("edit");
  }, []);

  const openEdit = useCallback((range) => {
    setEditRange(range);
    setMode("edit");
  }, []);

  // Wizard finished (saved or cancelled): return to listing + refetch.
  const handleWizardDone = useCallback((newRange) => {
    setMode("list");
    setEditRange(null);

    if (newRange && newRange._id) {
      // Instant feedback: patch the cached list in place before the
      // invalidated refetch below resolves.
      queryClient.setQueryData(campaignRangesQueryKey(campaignId), (prev) => {
        const prevRanges = prev?.ranges || [];
        const exists = prevRanges.some((r) => r._id === newRange._id);
        const nextRanges = exists
          ? prevRanges.map((r) => (r._id === newRange._id ? newRange : r))
          : [...prevRanges, newRange];
        return { ...(prev || { success: true }), ranges: nextRanges };
      });
    }

    invalidateCluster(campaignId);
  }, [queryClient, invalidateCluster, campaignId]);

  const openLaunch = useCallback(() => setLaunchOpen(true), []);
  const closeLaunch = useCallback(() => setLaunchOpen(false), []);
  const handleLaunched = useCallback(
    () => router.push(`/campaign/${campaignId}`),
    [router, campaignId],
  );

  const hasRanges = ranges.length > 0;
  const scratchesAllocated = Number(campaign?.allocated_scratch_cards) > 0;
  const qrGenerated = !!(campaign?.qrCodeUrl || campaign?.qrGeneratedAt);

  // Which step to open the wizard at
  const wizardInitialStep = scratchesAllocated ? "stores" : "allocate";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Page header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <Tag size={22} /> Setup Billing Range
          </h1>
          <p className={styles.subtitle}>
            Customers will receive rewards based on how much they spend.
          </p>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {mode === "edit" ? (
          campaignId && (
            <RangeWizard
              campaignId={campaignId}
              range={editRange}
              onDone={handleWizardDone}
            />
          )
        ) : loading ? (
          <div className={styles.stateMsg}>Loading reward ranges…</div>
        ) : (
          <>
            <div className={styles.rangeList}>
              {ranges.map((range, i) => (
                <button
                  key={range._id || i}
                  type="button"
                  className={styles.rangeRow}
                  onClick={() => openEdit(range)}
                >
                  <span className={styles.rangeRowText}>
                    Range {i + 1} ({range.label || `₹${range.minAmount} - ₹${range.maxAmount}`})
                  </span>
                  <Pencil size={16} className={styles.rangeRowEdit} />
                </button>
              ))}

              <button
                type="button"
                className={styles.addMoreRow}
                onClick={openCreate}
              >
                <span className={styles.addMoreIcon}>
                  <Plus size={14} strokeWidth={2.5} />
                </span>
                Add Billing Range
              </button>
            </div>

            {hasRanges && (
              qrGenerated ? (
                <button
                  type="button"
                  className={styles.viewCampaignBtn}
                  onClick={() => router.push(`/campaign/${campaignId}`)}
                >
                  View Campaign
                </button>
              ) : scratchesAllocated ? (
                <button
                  type="button"
                  className={styles.generateQrBtn}
                  onClick={openLaunch}
                >
                  <QrCode size={18} />
                  Generate QR
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.launchBtn}
                  onClick={openLaunch}
                >
                  Allocate Scratches
                </button>
              )
            )}
          </>
        )}

        {campaignId && (
          <LaunchWizardModal
            campaignId={campaignId}
            open={launchOpen}
            onClose={closeLaunch}
            onLaunched={handleLaunched}
            initialStep={wizardInitialStep}
          />
        )}

      </div>
    </div>
  );
}
