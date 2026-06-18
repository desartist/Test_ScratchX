"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  Store as StoreIcon,
  MapPin,
  Download,
  Copy,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./LaunchWizardModal.module.css";

// Quick-select chip presets. "No Cap" is intentionally NOT a real "infinite"
// value: the allocate-scratch API requires a positive number per campaign, so
// "No Cap" = an effectively-unlimited cap. We send a very large allocation
// (1,000,000) which the subscription entitlement still governs server-side.
const NO_CAP_AMOUNT = 1000000;
const CHIPS = [
  { label: "1,000", value: 1000 },
  { label: "2,000", value: 2000 },
  { label: "4,000", value: 4000 },
  { label: "5,000", value: 5000 },
  { label: "No Cap", value: NO_CAP_AMOUNT },
];

const DEFAULT_ALLOCATION = 2000;

// Format an ISO date for the unlimited-scratches card.
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * LaunchWizardModal
 *
 * Multi-step launch flow surfaced from the ranges page. Three steps:
 *   1. 'allocate' — allocate scratches to this campaign (POST allocate-scratch)
 *   2. 'stores'   — assign one or more stores (POST assign) then generate QR
 *   3. 'qr'       — show the generated QR with download/copy actions
 *
 * Reuses existing APIs only. Props:
 *   - campaignId: string
 *   - open: boolean
 *   - onClose: () => void
 *   - onLaunched: () => void  (called from the final "Go to Campaign" button)
 */
export default function LaunchWizardModal({
  campaignId,
  open,
  onClose,
  onLaunched,
  initialStep,
}) {
  const { account } = useAuthContext();
  const userId = account?.id || account?._id;
  const userRole = account?.role || "Merchant";

  const [step, setStep] = useState("allocate");

  // Loaded context.
  const [campaignName, setCampaignName] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [stores, setStores] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Allocate step state.
  const [allocation, setAllocation] = useState(DEFAULT_ALLOCATION);
  const [allocating, setAllocating] = useState(false);

  // Stores step state.
  const [selected, setSelected] = useState([]);
  const [launching, setLaunching] = useState(false);

  // QR step state.
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState(null);

  const readHeaders = useMemo(
    () => ({
      "x-user-id": userId || "",
      "x-user-role": userRole,
    }),
    [userId, userRole],
  );

  const writeHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userId || "",
      "x-user-role": userRole,
    }),
    [userId, userRole],
  );

  // Reset everything when the modal opens, then load context.
  useEffect(() => {
    if (!open || !campaignId || !userId) return;
    let active = true;

    setStep(initialStep || "allocate");
    setError(null);
    setAllocation(DEFAULT_ALLOCATION);
    setSelected([]);
    setQrCodeUrl("");
    setCopied(false);
    setLoading(true);

    (async () => {
      // Campaign (name + assigned stores).
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`, {
          credentials: "include",
          headers: readHeaders,
        });
        const data = await res.json().catch(() => ({}));
        const c = data?.data || data?.campaign || data || {};
        if (active) {
          setCampaignName(c?.campaignName || "");
          const ids = (c?.assignedStores || [])
            .filter((s) => s && s.status === "active" && (s.storeId || s._id))
            .map((s) => String(s.storeId || s._id));
          setAssignedIds(ids);
        }
      } catch {
        if (active) {
          setCampaignName("");
          setAssignedIds([]);
        }
      }

      // Subscription status.
      try {
        const res = await fetch("/api/subscription/status", {
          credentials: "include",
          headers: readHeaders,
        });
        const data = await res.json().catch(() => ({}));
        if (active) setSubscription(data || null);
      } catch {
        if (active) setSubscription(null);
      }

      // Stores.
      try {
        const res = await fetch("/api/stores", {
          credentials: "include",
          headers: readHeaders,
        });
        const data = await res.json().catch(() => ({}));
        if (active) {
          setStores(
            data?.success && Array.isArray(data.data) ? data.data : [],
          );
        }
      } catch {
        if (active) setStores([]);
      }

      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [open, campaignId, userId, readHeaders, initialStep]);

  // Pre-select already-assigned stores (or auto-select the single store) once
  // both stores and assignment data have loaded.
  useEffect(() => {
    if (loading) return;
    if (stores.length === 1) {
      setSelected([String(stores[0]._id)]);
      return;
    }
    if (assignedIds.length > 0) {
      const valid = new Set(stores.map((s) => String(s._id)));
      setSelected(assignedIds.filter((id) => valid.has(id)));
    }
  }, [loading, stores, assignedIds]);

  const handleSelectChip = useCallback((value) => {
    setAllocation(value);
  }, []);

  const handleToggleStore = useCallback((storeId) => {
    setSelected((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId],
    );
  }, []);

  // Step 1 -> Step 2: allocate scratches.
  const handleAllocate = useCallback(async () => {
    setError(null);
    const amount = Number(allocation);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a scratch amount greater than 0.");
      return;
    }
    setAllocating(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/allocate-scratch`,
        {
          method: "POST",
          credentials: "include",
          headers: writeHeaders,
          body: JSON.stringify({ allocationAmount: amount }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setStep("stores");
      } else {
        setError(
          data?.error || data?.message || "Failed to allocate scratches.",
        );
      }
    } catch {
      setError("Failed to allocate scratches.");
    } finally {
      setAllocating(false);
    }
  }, [allocation, campaignId, writeHeaders]);

  // Step 2 -> Step 3: assign stores then generate QR.
  const handleLaunch = useCallback(async () => {
    setError(null);
    if (selected.length === 0) return;
    setLaunching(true);
    try {
      const assignRes = await fetch(`/api/campaigns/${campaignId}/assign`, {
        method: "POST",
        credentials: "include",
        headers: writeHeaders,
        body: JSON.stringify({ storeIds: selected }),
      });
      const assignData = await assignRes.json().catch(() => ({}));
      if (!assignRes.ok || !assignData?.success) {
        setError(
          assignData?.error ||
            assignData?.message ||
            "Failed to assign store(s).",
        );
        setLaunching(false);
        return;
      }

      const qrRes = await fetch(`/api/campaigns/${campaignId}/generate-qr`, {
        method: "POST",
        credentials: "include",
        headers: writeHeaders,
      });
      const qrData = await qrRes.json().catch(() => ({}));
      if (qrRes.ok && qrData?.success && qrData?.data?.qrCodeUrl) {
        setQrCodeUrl(qrData.data.qrCodeUrl);
        setStep("qr");
      } else {
        setError(
          qrData?.message ||
            qrData?.error ||
            "Failed to generate the campaign QR code.",
        );
      }
    } catch {
      setError("Failed to launch the campaign.");
    } finally {
      setLaunching(false);
    }
  }, [selected, campaignId, writeHeaders]);

  const handleCopyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/scan/${campaignId}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => setCopied(true))
        .catch(() => setCopied(false));
    }
  }, [campaignId]);

  const handleGoToCampaign = useCallback(() => {
    if (typeof onLaunched === "function") onLaunched();
  }, [onLaunched]);

  const handleBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget && typeof onClose === "function") {
        onClose();
      }
    },
    [onClose],
  );

  const isUnlimited = !!subscription?.unlimitedScratches;
  const isSingleStore = stores.length === 1;

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Launch campaign"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className={styles.stateMsg}>Loading…</div>
        ) : step === "allocate" ? (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h2 className={styles.title}>Allocate Scratches</h2>
              {campaignName && (
                <p className={styles.subtitle}>{campaignName}</p>
              )}
            </header>

            {isUnlimited ? (
              <div className={styles.unlimitedCard}>
                <span className={styles.pill}>First Quarter Access</span>
                <span className={styles.unlimitedTitle}>
                  <Sparkles size={20} /> Unlimited scratch cards / quarter
                </span>
                <span className={styles.unlimitedMeta}>
                  {subscription?.scratchConsumed || 0} used · Valid until{" "}
                  {formatDate(subscription?.unlimitedScratchesExpiryDate)}
                </span>
              </div>
            ) : (
              <div className={styles.scratchCard}>
                <span className={styles.scratchCardTitle}>Scratches</span>
                <span className={styles.scratchCardMeta}>
                  {subscription?.plan
                    ? `${subscription.plan} plan`
                    : "No active plan"}{" "}
                  ·{" "}
                  {subscription?.scratchRemaining === "UNLIMITED"
                    ? "Unlimited"
                    : `${subscription?.scratchRemaining ?? 0} remaining`}
                </span>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="lw-allocation">
                Scratches for this Campaign
              </label>
              <input
                id="lw-allocation"
                type="number"
                min="1"
                className={styles.input}
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
              />
            </div>

            <div className={styles.chips}>
              {CHIPS.map((chip) => {
                const isActive = Number(allocation) === chip.value;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    className={
                      isActive
                        ? `${styles.chip} ${styles.chipActive}`
                        : styles.chip
                    }
                    onClick={() => handleSelectChip(chip.value)}
                  >
                    {isActive && <Check size={14} className={styles.chipCheck} />}
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onClose}
                disabled={allocating}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleAllocate}
                disabled={allocating}
              >
                {allocating ? "Allocating…" : "Allocate and move to the next"}
                {!allocating && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        ) : step === "stores" ? (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h2 className={styles.title}>Assign Stores</h2>
              <p className={styles.subtitle}>
                Choose where this campaign will run.
              </p>
            </header>

            {stores.length === 0 ? (
              <div className={styles.stateMsg}>
                No stores found. Create a store first to launch this campaign.
              </div>
            ) : isSingleStore ? (
              <div className={styles.storeCard}>
                <div className={styles.storeMain}>
                  <span className={styles.storeName}>
                    {stores[0].store_name || "Store"}
                  </span>
                  <span className={styles.storeMeta}>
                    {stores[0].store_code && (
                      <span className={styles.storeCode}>
                        {stores[0].store_code}
                      </span>
                    )}
                    <span className={styles.storeLoc}>
                      <MapPin size={13} />
                      {stores[0].city || stores[0].address || "—"}
                    </span>
                  </span>
                </div>
                <span className={styles.checkBadge}>
                  <Check size={16} />
                </span>
              </div>
            ) : (
              <ul className={styles.storeList}>
                {stores.map((store) => {
                  const id = String(store._id);
                  const isSelected = selected.includes(id);
                  return (
                    <li key={id}>
                      <label className={styles.storeRow}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isSelected}
                          onChange={() => handleToggleStore(id)}
                        />
                        <span className={styles.storeMain}>
                          <span className={styles.storeName}>
                            <StoreIcon size={14} />{" "}
                            {store.store_name || "Store"}
                          </span>
                          <span className={styles.storeMeta}>
                            {store.store_code && (
                              <span className={styles.storeCode}>
                                {store.store_code}
                              </span>
                            )}
                            <span className={styles.storeLoc}>
                              <MapPin size={13} />
                              {store.city || store.address || "—"}
                            </span>
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setStep("allocate")}
                disabled={launching}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleLaunch}
                disabled={launching || selected.length === 0}
              >
                {launching ? "Launching…" : "Launch the campaign"}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h2 className={styles.title}>Campaign Launched 🎉</h2>
              <p className={styles.subtitle}>
                Your campaign is live. Share the QR code to start collecting
                scans.
              </p>
            </header>

            {qrCodeUrl && (
              <div className={styles.qrWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Campaign QR code"
                  className={styles.qrImage}
                />
              </div>
            )}

            <div className={styles.qrActions}>
              <a
                className={styles.secondaryBtn}
                href={qrCodeUrl}
                download={`campaign-${campaignId}-qr.png`}
              >
                <Download size={16} /> Download PNG
              </a>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleCopyLink}
              >
                <Copy size={16} /> {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleGoToCampaign}
              >
                Go to Campaign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
