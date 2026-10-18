"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gift, ImageIcon, X } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useCampaignQuery, useCampaignRangesQuery } from "@/hooks/queries/useCampaignQuery";
import styles from "./RangeWizard.module.css";
import {
  autoActivated,
  couponsFromRange,
  DEFAULT_COUPONS,
  emptyCoupon,
  makeCoupons,
  MAX_QUANTITY,
  minAvailable,
  parseQty,
  withAvailable,
} from "./couponSlots";

const REWARD_TYPES = [
  { label: "Fixed Amount", value: "flat" },
  { label: "Percentage", value: "percentage" },
  { label: "Gift", value: "gift" },
];

const REPLENISH_FIRST = "Please increase the available quantity before activating this coupon.";

// Format number to Indian numbering system (10,000 instead of 10000)
function formatIndian(num) {
  const str = String(num).replace(/\D/g, ''); // Remove non-digits
  if (!str) return '';
  if (str.length <= 3) return str;
  let result = str.slice(-3); // Last 3 digits
  for (let i = str.length - 3; i > 0; i -= 2) {
    result = str.slice(Math.max(0, i - 2), i) + ',' + result;
  }
  return result;
}

// Parse Indian formatted number back to plain number
function parseIndian(str) {
  return str.replace(/,/g, '');
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

  // Shares the same cached campaign + ranges responses as
  // campaign/[id]/page.js, campaign/[id]/ranges/page.js, and RewardRanges.js.
  const { data: campaignJson, isPending: campaignLoading } = useCampaignQuery(campaignId);
  const { data: rangesJson, isPending: rangesLoading } = useCampaignRangesQuery(campaignId);
  const loading = campaignLoading || rangesLoading;
  const [existingCount, setExistingCount] = useState(0);
  const [displayCoupons, setDisplayCoupons] = useState(null); // Derived from campaign

  const [minAmount, setMinAmount] = useState(
    isEdit && range?.minAmount != null ? String(range.minAmount) : "",
  );
  const [maxAmount, setMaxAmount] = useState(
    isEdit && range?.maxAmount != null ? String(range.maxAmount) : "",
  );
  const [coupons, setCoupons] = useState(() =>
    isEdit
      ? couponsFromRange(range?.rewards, range?.rewards?.length)
      : makeCoupons(DEFAULT_COUPONS),
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

  // Seed displayCoupons/coupons/existingCount once both queries resolve — a
  // ref guard stops a background refetch from clobbering in-progress edits.
  const seededRef = useRef(false);
  useEffect(() => {
    if (loading || seededRef.current) return;
    seededRef.current = true;

    const c = campaignJson?.data;
    const dc = Number(c?.displayCoupons);
    const coupCount = Number.isFinite(dc) && dc > 0 ? dc : DEFAULT_COUPONS;
    const rangeLen = Array.isArray(rangesJson?.ranges) ? rangesJson.ranges.length : 0;

    setDisplayCoupons(coupCount);
    if (isEdit) {
      setCoupons((prev) => {
        if (prev.length >= coupCount) return prev;
        const next = prev.slice();
        while (next.length < coupCount) next.push(emptyCoupon({ padded: true }));
        return next;
      });
    } else {
      setCoupons(makeCoupons(coupCount));
    }
    setExistingCount(rangeLen);
  }, [loading, campaignJson, rangesJson, isEdit]);

  const currentRangeNumber = existingCount + 1;

  const handleCouponChange = useCallback((index, field, val) => {
    setCoupons((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        // Indian comma-grouping is only for the flat (₹) amount field.
        // Applying it to a percentage value strips its decimal point —
        // formatIndian removes every non-digit character — turning "35.5"
        // into "355", so only run it for "flat" coupons.
        const processed =
          field === "amount" && val && c.type === "flat" && /^\d/.test(val)
            ? formatIndian(val)
            : val;
        const next = { ...c, [field]: processed };
        return field === "amount" ? autoActivated(next, processed) : next;
      }),
    );
  }, []);

  // When user switches type, clear the amount to avoid stale values — but
  // keep the reward's identity, status and stock: it's the same coupon slot,
  // so its redemption history and quantity carry over.
  const handleTypeChange = useCallback((index, newType) => {
    setCoupons((prev) =>
      prev.map((c, i) => (i === index ? { ...c, type: newType, amount: "", description: "" } : c)),
    );
  }, []);

  // Per-coupon inline messages (e.g. "increase the quantity first").
  const [couponNotice, setCouponNotice] = useState({});
  const noticeFor = useCallback((index, msg) => {
    setCouponNotice((prev) => ({ ...prev, [index]: msg }));
  }, []);

  const handleToggleActive = useCallback((index) => {
    const c = coupons[index];
    if (!c) return;
    const turningOn = !c.isActive;
    // A limited coupon with nothing left can't be switched on — stock has to
    // be raised first (the server enforces this too).
    if (turningOn && c.quantityEnabled) {
      const left = parseQty(c.availableQuantity);
      if (left == null || left <= 0) {
        noticeFor(index, REPLENISH_FIRST);
        return;
      }
    }
    noticeFor(index, null);
    setCoupons((prev) =>
      prev.map((x, i) => (i === index ? { ...x, isActive: turningOn, autoActivate: false } : x)),
    );
  }, [coupons, noticeFor]);

  const handleToggleQuantity = useCallback((index) => {
    noticeFor(index, null);
    setCoupons((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const enabling = !c.quantityEnabled;
        // A fresh limit starts at 1 available, so turning it on never starts
        // out invalid (or switches the coupon off).
        const current = parseQty(c.availableQuantity);
        return {
          ...c,
          quantityEnabled: enabling,
          availableQuantity: enabling && (current == null || current < 1) ? "1" : c.availableQuantity,
        };
      }),
    );
  }, [noticeFor]);

  const handleQuantityInput = useCallback((index, raw) => {
    noticeFor(index, null);
    // Digits only — rules out negatives, decimals and letters as you type.
    const digits = String(raw).replace(/\D/g, "").slice(0, 7);
    setCoupons((prev) => prev.map((c, i) => (i === index ? withAvailable(c, digits) : c)));
  }, [noticeFor]);

  const handleQuantityStep = useCallback((index, delta) => {
    noticeFor(index, null);
    setCoupons((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const floor = minAvailable(c);
        const current = parseQty(c.availableQuantity) ?? floor;
        const next = Math.min(MAX_QUANTITY, Math.max(floor, current + delta));
        return withAvailable(c, String(next));
      }),
    );
  }, [noticeFor]);

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
        prev.map((c, i) => (i === index ? autoActivated({ ...c, amount: dataUrl }, dataUrl) : c)),
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

    const min = Number(parseIndian(minAmount));
    const max = Number(parseIndian(maxAmount));

    if (!Number.isFinite(min) || min <= 0) {
      setFormError("Enter a minimum amount greater than 0.");
      return;
    }
    if (!Number.isFinite(max) || max < min) {
      setFormError("Max amount must be greater than or equal to min amount.");
      return;
    }

    // Activation + optional stock travel with every reward. Only the
    // available quantity is sent; the server adds its own live redeemed count
    // to get the total (counters are never taken from the client).
    const statusFields = (c, index) => {
      if (!c.quantityEnabled) {
        return { rewardId: c.rewardId, isActive: c.isActive, quantityEnabled: false, totalQuantity: null };
      }
      const available = parseQty(c.availableQuantity);
      if (available == null || available < minAvailable(c)) {
        throw new Error(`Coupon ${index + 1}: enter a whole number between ${minAvailable(c)} and ${MAX_QUANTITY.toLocaleString("en-IN")}.`);
      }
      if (c.isActive && available <= 0) {
        throw new Error(`Coupon ${index + 1}: ${REPLENISH_FIRST}`);
      }
      return { rewardId: c.rewardId, isActive: c.isActive, quantityEnabled: true, availableQuantity: available };
    };

    const rewards = [];
    try {
      coupons.forEach((c, index) => {
        if (c.type === "gift") {
          if (c.amount && c.amount.startsWith("data:image/")) {
            rewards.push({ type: "gift", value: c.amount, description: (c.description || "").trim(), ...statusFields(c, index) });
          }
          return;
        }
        const value = Number(parseIndian(c.amount));
        if (c.amount === "" || !Number.isFinite(value) || value <= 0) return;
        if (c.type === "percentage") {
          rewards.push({ type: c.type, value, description: (c.description || "").trim(), ...statusFields(c, index) });
        } else {
          rewards.push({ type: c.type, value, ...statusFields(c, index) });
        }
      });
    } catch (err) {
      setFormError(err.message);
      return;
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

      if (typeof onDone === "function") { onDone(data?.range); return; }
      if (typeof onComplete === "function") onComplete(data?.range);
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
            type="text"
            className={styles.input}
            placeholder="e.g. 1,000"
            value={minAmount}
            onChange={(e) => {
              const parsed = parseIndian(e.target.value);
              setMinAmount(parsed ? formatIndian(parsed) : '');
            }}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="rw-max">Max Amount (₹)</label>
          <input
            id="rw-max"
            type="text"
            className={styles.input}
            placeholder="e.g. 10,000"
            value={maxAmount}
            onChange={(e) => {
              const parsed = parseIndian(e.target.value);
              setMaxAmount(parsed ? formatIndian(parsed) : '');
            }}
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
        {coupons.map((coupon, index) => {
          const left = coupon.quantityEnabled ? parseQty(coupon.availableQuantity) : null;
          const redeemed = Number(coupon.redeemedQuantity) || 0;
          const outOfStock = coupon.quantityEnabled && left != null && left <= 0;
          const isStored = Boolean(coupon.rewardId);
          return (
          <div
            key={index}
            className={`${styles.couponCard} ${coupon.isActive ? "" : styles.couponInactive}`}
          >
            <div className={styles.couponHeader}>
              <div className={styles.couponTitle}>
                <Gift size={16} className={styles.couponIcon} />
                Coupon {index + 1}
              </div>
              <div className={styles.toggleWrap}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={coupon.isActive}
                  aria-label={`Coupon ${index + 1} ${coupon.isActive ? "active" : "inactive"}`}
                  className={`${styles.toggle} ${coupon.isActive ? styles.toggleOn : ""}`}
                  onClick={() => handleToggleActive(index)}
                >
                  <span className={styles.toggleKnob} />
                </button>
                <span className={styles.toggleLabel}>{coupon.isActive ? "Active" : "Inactive"}</span>
              </div>
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
                        type="text"
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
                        placeholder="e.g. 10 or 12.5"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={coupon.amount}
                        onChange={(e) => handleCouponChange(index, "amount", e.target.value)}
                      />
                      <span className={styles.inputSuffix}>%</span>
                    </div>
                    <label className={styles.label} htmlFor={`rw-pct-desc-${index}`}>
                      Description
                    </label>
                    <textarea
                      id={`rw-pct-desc-${index}`}
                      className={styles.input}
                      placeholder="Describe the offer, e.g. 10% off on your next purchase"
                      rows={2}
                      value={coupon.description || ""}
                      onChange={(e) => handleCouponChange(index, "description", e.target.value)}
                    />
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
                     <label className={styles.label} htmlFor={`rw-gift-desc-${index}`}>
                      Description
                    </label>
                    <textarea
                      id={`rw-gift-desc-${index}`}
                      className={styles.input}
                      placeholder="Describe the gift, e.g. Free Coffee Mug"
                      rows={2}
                      value={coupon.description || ""}
                      onChange={(e) => handleCouponChange(index, "description", e.target.value)}
                    />
                  </>
                )}
              </div>

              {/* Optional stock — unchecked means unlimited (the old behaviour). */}
              <div className={styles.qtyRow}>
                <label className={styles.qtyCheck}>
                  <input
                    type="checkbox"
                    checked={coupon.quantityEnabled}
                    onChange={() => handleToggleQuantity(index)}
                  />
                  <span className={styles.qtyCheckBox} aria-hidden="true" />
                  <span>Set Reward Quantity</span>
                </label>
                {coupon.quantityEnabled && (
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepBtn}
                      onClick={() => handleQuantityStep(index, -1)}
                      disabled={(left ?? 0) <= minAvailable(coupon)}
                      aria-label={`Decrease coupon ${index + 1} quantity`}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.stepInput}
                      value={coupon.availableQuantity}
                      onChange={(e) => handleQuantityInput(index, e.target.value)}
                      aria-label={`Coupon ${index + 1} available quantity`}
                    />
                    <button
                      type="button"
                      className={styles.stepBtn}
                      onClick={() => handleQuantityStep(index, 1)}
                      disabled={(left ?? 0) + redeemed >= MAX_QUANTITY}
                      aria-label={`Increase coupon ${index + 1} quantity`}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Stock status — shown when editing a saved reward. */}
              {isStored && (
                <div className={styles.stockStats}>
                  {!coupon.quantityEnabled ? (
                    <span className={styles.stockBadge}>Unlimited</span>
                  ) : (
                    <>
                      {outOfStock && <span className={`${styles.stockBadge} ${styles.stockOut}`}>Out of Stock</span>}
                      <span>Total <strong>{left == null ? "—" : left + redeemed}</strong></span>
                      <span>Remaining <strong>{left ?? "—"}</strong></span>
                      <span>Redeemed <strong>{redeemed}</strong></span>
                    </>
                  )}
                </div>
              )}

              {couponNotice[index] && (
                <p className={styles.couponNotice} role="alert">{couponNotice[index]}</p>
              )}
            </div>
          </div>
          );
        })}
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
