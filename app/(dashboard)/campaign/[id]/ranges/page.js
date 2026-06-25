"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Tag, Pencil, Plus, QrCode } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { criticalFetchService } from "@/lib/criticalFetchService";
import RangeWizard from "@/components/campaign/RangeWizard";
import LaunchWizardModal from "@/components/campaign/LaunchWizardModal";
import styles from "./ranges.module.css";

/**
 * Step 2 of campaign setup — "Setup Billing Range".
 *
 * LISTING state: shows each existing range as a clickable row (opens the
 * editor) plus an "Add more range" ghost row (opens the editor in create
 * mode) and a "Preview & Launch" button (-> campaign details).
 * EDITOR state: renders <RangeWizard> for create OR edit; on done, returns
 * to the listing and refetches.
 */
export default function CampaignRangesStepPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id;
  const { account, token } = useAuthContext();

  const userId = account?.id || account?._id;
  const userRole = account?.role || "Merchant";

  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Campaign data (scratch allocation + QR state).
  const [campaign, setCampaign] = useState(null);

  // mode: 'list' | 'edit'. editRange null => create.
  const [mode, setMode] = useState("list");
  const [editRange, setEditRange] = useState(null);

  // Launch wizard modal (allocate scratches -> assign stores -> QR).
  const [launchOpen, setLaunchOpen] = useState(false);

  const fetchRanges = useCallback(async () => {
    if (!campaignId || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const headers = {
        "x-user-id": userId,
        "x-user-role": userRole,
        Authorization: token ? `Bearer ${token}` : "",
      };

      const result = await criticalFetchService.fetchCriticalFirst(
        `campaign-ranges-${campaignId}`,
        [
          {
            key: 'ranges',
            url: `/api/campaign_range?id=${campaignId}`,
            options: { method: "GET", credentials: "include", headers },
          },
          {
            key: 'campaign',
            url: `/api/campaigns/${campaignId}`,
            options: { credentials: "include", headers },
          },
        ],
        []
      );

      const rangesData = result.critical?.ranges;
      if (rangesData?.success && Array.isArray(rangesData.ranges)) {
        setRanges(rangesData.ranges);
      } else {
        setRanges([]);
      }

      const campaignData = result.critical?.campaign;
      setCampaign(campaignData?.data || campaignData?.campaign || campaignData || null);
    } catch (err) {
      console.error("Failed to fetch ranges:", err);
      setError("Failed to load reward ranges");
      setRanges([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId, userId, userRole, token]);

  useEffect(() => {
    fetchRanges();
  }, [fetchRanges]);

  const openCreate = useCallback(() => {
    setEditRange(null);
    setMode("edit");
  }, []);

  const openEdit = useCallback((range) => {
    setEditRange(range);
    setMode("edit");
  }, []);

  // Wizard finished (saved or cancelled): return to listing + refetch.
  const handleWizardDone = useCallback(() => {
    setMode("list");
    setEditRange(null);
    fetchRanges();
  }, [fetchRanges]);

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
                Add more range
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
