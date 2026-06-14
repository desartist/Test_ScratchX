"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Tag, ChevronRight, Plus } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
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
      const res = await fetch(`/api/campaign_range?id=${campaignId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "x-user-id": userId,
          "x-user-role": userRole,
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && Array.isArray(data.ranges)) {
        setRanges(data.ranges);
      } else {
        setRanges([]);
      }
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Step header */}
        <div className={styles.header}>
          <div className={styles.steps}>
            <span className={styles.stepDone}>1. Basic Info</span>
            <span className={styles.stepDivider} />
            <span className={styles.stepActive}>2. Reward Ranges</span>
            <span className={styles.stepDivider} />
            <span className={styles.stepNext}>3. Launch Setup</span>
          </div>
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
                  <span className={styles.rangeRowLeft}>
                    <span className={styles.rangeRowName}>Range {i + 1}</span>
                    <span className={styles.rangeRowLabel}>
                      {range.label ||
                        `₹${range.minAmount} - ₹${range.maxAmount}`}
                    </span>
                  </span>
                  <ChevronRight size={18} className={styles.rangeRowChevron} />
                </button>
              ))}

              <button
                type="button"
                className={styles.addMoreRow}
                onClick={openCreate}
              >
                <Plus size={16} /> Add more range
              </button>
            </div>

            <button
              type="button"
              className={styles.launchBtn}
              onClick={openLaunch}
              disabled={!hasRanges}
            >
              Allocate Scratches
            </button>
          </>
        )}

        {campaignId && (
          <LaunchWizardModal
            campaignId={campaignId}
            open={launchOpen}
            onClose={closeLaunch}
            onLaunched={handleLaunched}
          />
        )}

        {/* Navigation */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.push("/campaign")}
          >
            <ArrowLeft size={18} /> Back to campaigns
          </button>
        </div>
      </div>
    </div>
  );
}
