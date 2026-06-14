"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gift, ImageIcon, X } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./RangeWizard.module.css";

const DEFAULT_COUPONS = 6;

const REWARD_TYPES = [
  { label: "Fixed Amount", value: "flat" },
  { label: "Percentage", value: "percentage" },
  { label: "Gift", value: "gift" },
];

const VALID_TYPES = new Set(REWARD_TYPES.map((t) => t.value));

function makeCoupons(count) {
  const safe = Number(count) > 0 ? Number(count) : DEFAULT_COUPONS;
  return Array.from({ length: safe }, () => ({ type: "flat", amount: "" }));
}

function couponsFromRange(rewards, min) {
  const list = Array.isArray(rewards) ? rewards : [];
  const mapped = list.map((r) => {
    const type = VALID_TYPES.has(r?.type) ? r.type : "flat";
    const raw  = r?.value ?? r?.amount ?? "";
    return { type, amount: raw === "" || raw == null ? "" : String(raw) };
  });
  const target = Math.max(Number(min) > 0 ? Number(min) : DEFAULT_COUPONS, mapped.length);
  while (mapped.length < target) mapped.push({ type: "flat", amount: "" });
  return mapped;
}

// Canvas-based client-side image compression → base64 JPEG
function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * RangeWizard — reward-range creation/edit form.
 *
 * Reward types:
 *  - flat       → ₹ prefix + number input
 *  - percentage → number input + % suffix
 *  - gift       → image upload (base64 stored as value)
 */
export default function RangeWizard({ campaignId, range, onComplete, onDone }) {
  const { account } = useAuthContext();
  const userId  = account?.id || account?._id;
  const userRole = account?.role || "Merchant";

  const isEdit = !!range;

  const [loading,       setLoading]       = useState(true);
  const [existingCount, setExistingCount] = useState(0);

  const [minAmount, setMinAmount] = useState(
    isEdit && range?.minAmount != null ? String(range.minAmount) : "",
  );
  const [maxAmount, setMaxAmount] = useState(
    isEdit && range?.maxAmount != null ? String(range.maxAmount) : "",
  );
  const [coupons, setCoupons] = useState(() =>
    isEdit ? couponsFromRange(range?.rewards, DEFAULT_COUPONS) : makeCoupons(DEFAULT_COUPONS),
  );

  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState(null);
  // Per-coupon upload state: { [index]: true|false }
  const [uploading, setUploading] = useState({});

  // One file input ref per coupon slot (created lazily)
  const fileRefs = useRef([]);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-id":   userId || "",
      "x-user-role": userRole,
    }),
    [userId, userRole],
  );

  useEffect(() => {
    if (!campaignId || !userId) return;
    let active = true;
    (async () => {
      const readHeaders = { "x-user-id": userId, "x-user-role": userRole };
      let coupCount = DEFAULT_COUPONS;
      let rangeLen  = 0;
      try {
        const res  = await fetch(`/api/campaigns/${campaignId}`, { headers: readHeaders });
        const data = await res.json().catch(() => ({}));
        const c    = data?.data || data?.campaign || data;
        const dc   = Number(c?.displayCoupons);
        coupCount  = Number.isFinite(dc) && dc > 0 ? dc : DEFAULT_COUPONS;
      } catch { coupCount = DEFAULT_COUPONS; }
      try {
        const res  = await fetch(`/api/campaign_range?id=${campaignId}`, { headers: readHeaders });
        const data = await res.json().catch(() => ({}));
        rangeLen   = Array.isArray(data?.ranges) ? data.ranges.length : 0;
      } catch { rangeLen = 0; }
      if (!active) return;
      if (isEdit) {
        setCoupons((prev) => {
          if (prev.length >= coupCount) return prev;
          const next = prev.slice();
          while (next.length < coupCount) next.push({ type: "flat", amount: "" });
          return next;
        });
      } else {
        setCoupons(makeCoupons(coupCount));
      }
      setExistingCount(rangeLen);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [campaignId, userId, userRole, isEdit]);

  const currentRangeNumber = existingCount + 1;

  const handleCouponChange = useCallback((index, field, val) => {
    setCoupons((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: val } : c)));
  }, []);

  // When user switches type, clear the amount to avoid stale values
  const handleTypeChange = useCallback((index, newType) => {
    setCoupons((prev) =>
      prev.map((c, i) => (i === index ? { type: newType, amount: "" } : c)),
    );
  }, []);

  const handleGiftFileChange = useCallback(async (index, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file.");
      return;
    }
    setUploading((prev) => ({ ...prev, [index]: true }));
    setFormError(null);
    try {
      const dataUrl = await compressImage(file, 400, 0.82);
      setCoupons((prev) =>
        prev.map((c, i) => (i === index ? { ...c, amount: dataUrl } : c)),
      );
    } catch {
      setFormError("Failed to process image. Please try another file.");
    } finally {
      setUploading((prev) => ({ ...prev, [index]: false }));
      if (fileRefs.current[index]) fileRefs.current[index].value = "";
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (typeof onDone === "function") onDone();
  }, [onDone]);

  const handleSave = useCallback(async () => {
    setFormError(null);

    const min = Number(minAmount);
    const max = Number(maxAmount);

    if (!Number.isFinite(min) || min <= 0) {
      setFormError("Enter a minimum amount greater than 0.");
      return;
    }
    if (!Number.isFinite(max) || max < min) {
      setFormError("Max amount must be greater than or equal to min amount.");
      return;
    }

    const rewards = [];
    for (const c of coupons) {
      if (c.type === "gift") {
        if (c.amount && c.amount.startsWith("data:image/")) {
          rewards.push({ type: "gift", value: c.amount });
        }
        continue;
      }
      const value = Number(c.amount);
      if (c.amount === "" || !Number.isFinite(value) || value <= 0) continue;
      rewards.push({ type: c.type, value });
    }

    if (rewards.length === 0) {
      setFormError("Add at least one reward (amount or gift image) to a coupon.");
      return;
    }

    setSaving(true);
    try {
      const body = { campaignId, minAmount: min, maxAmount: max, rewards };
      if (isEdit && range?._id) body.rangeId = range._id;

      const res  = await fetch("/api/campaign_range", {
        method:      "POST",
        credentials: "include",
        headers:     authHeaders,
        body:        JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        setFormError(
          data?.error || data?.message || "Failed to save range. You may have reached your plan limit.",
        );
        return;
      }

      if (typeof onDone === "function") { onDone(); return; }
      if (typeof onComplete === "function") onComplete();
    } catch {
      setFormError("Failed to save range.");
    } finally {
      setSaving(false);
    }
  }, [minAmount, maxAmount, coupons, campaignId, authHeaders, isEdit, range, onDone, onComplete]);

  if (loading) return <div className={styles.stateMsg}>Loading reward ranges…</div>;

  return (
    <div className={styles.wizard}>
      <h2 className={styles.rangeHeading}>
        {isEdit ? "Edit Range" : `Range ${currentRangeNumber}`}
      </h2>

      <div className={styles.amountRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="rw-min">Min. Amount (₹)</label>
          <input
            id="rw-min"
            type="number"
            className={styles.input}
            placeholder="e.g. 1"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="rw-max">Max Amount (₹)</label>
          <input
            id="rw-max"
            type="number"
            className={styles.input}
            placeholder="e.g. 499"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.rewardsHead}>
        <h3 className={styles.sectionTitle}>Set Reward Cards</h3>
        <p className={styles.sectionSub}>
          Customers will receive one of these rewards after scratching
        </p>
      </div>

      <div className={styles.couponStack}>
        {coupons.map((coupon, index) => (
          <div key={index} className={styles.couponCard}>
            <div className={styles.couponTitle}>
              <Gift size={16} className={styles.couponIcon} />
              Coupon {index + 1}
            </div>
            <div className={styles.couponGrid}>
              {/* Reward type selector */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`rw-type-${index}`}>
                  Reward Type
                </label>
                <select
                  id={`rw-type-${index}`}
                  className={styles.select}
                  value={coupon.type}
                  onChange={(e) => handleTypeChange(index, e.target.value)}
                >
                  {REWARD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic value input */}
              <div className={styles.field}>
                {coupon.type === "flat" && (
                  <>
                    <label className={styles.label} htmlFor={`rw-amt-${index}`}>
                      Amount
                    </label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputPrefix}>₹</span>
                      <input
                        id={`rw-amt-${index}`}
                        type="number"
                        className={`${styles.input} ${styles.inputWithPrefix}`}
                        placeholder="e.g. 50"
                        value={coupon.amount}
                        onChange={(e) => handleCouponChange(index, "amount", e.target.value)}
                      />
                    </div>
                  </>
                )}

                {coupon.type === "percentage" && (
                  <>
                    <label className={styles.label} htmlFor={`rw-pct-${index}`}>
                      Percentage
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id={`rw-pct-${index}`}
                        type="number"
                        className={`${styles.input} ${styles.inputWithSuffix}`}
                        placeholder="e.g. 10"
                        min="1"
                        max="100"
                        value={coupon.amount}
                        onChange={(e) => handleCouponChange(index, "amount", e.target.value)}
                      />
                      <span className={styles.inputSuffix}>%</span>
                    </div>
                  </>
                )}

                {coupon.type === "gift" && (
                  <>
                    <label className={styles.label}>Gift Image</label>
                    <input
                      ref={(el) => { fileRefs.current[index] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className={styles.giftFileInput}
                      onChange={(e) => handleGiftFileChange(index, e.target.files?.[0])}
                    />
                    {coupon.amount && coupon.amount.startsWith("data:image/") ? (
                      <div className={styles.giftPreviewWrap}>
                        <img
                          src={coupon.amount}
                          alt="Gift preview"
                          className={styles.giftPreviewImg}
                        />
                        <button
                          type="button"
                          className={styles.giftRemoveBtn}
                          onClick={() => handleCouponChange(index, "amount", "")}
                          title="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.giftUploadBtn}
                        onClick={() => fileRefs.current[index]?.click()}
                        disabled={uploading[index]}
                      >
                        {uploading[index] ? (
                          <span className={styles.giftSpinner} />
                        ) : (
                          <ImageIcon size={16} />
                        )}
                        {uploading[index] ? "Processing…" : "Upload Image"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {formError && <div className={styles.errorBox}>{formError}</div>}

      <div className={styles.savedActions}>
        {typeof onDone === "function" && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Range"}
        </button>
      </div>
    </div>
  );
}
