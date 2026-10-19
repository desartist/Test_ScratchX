"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Check,
  Gift,
  Info,
  AlertCircle,
  Coins,
  Infinity as InfinityIcon,
  Users,
  Shuffle,
  Layers,
  Settings,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useCampaignQuery, useCampaignRangesQuery, useInvalidateCampaignCluster } from "@/hooks/queries/useCampaignQuery";
import { useSubscriptionStatusQuery } from "@/hooks/queries/useSubscriptionQuery";
import { couponQuantityPlan, minimumAllocation, requiredAllocation } from "@/lib/couponQuantityPlan";
import styles from "./CampaignScratchesStep.module.css";

// Quick-select chip presets. "No Cap" is intentionally NOT a real "infinite"
// value: the allocate-scratch API requires a positive number per campaign, so
// "No Cap" = an effectively-unlimited cap. This sentinel is only safe to
// submit as-is while the merchant's unlimited-scratches grant is active,
// since the server skips the balance check entirely in that case — for a
// pack-based merchant, No Cap means "everything I have": today's total plus
// the remaining balance (see handleSelectChip).
const NO_CAP_AMOUNT = 1000000;
const CHIPS = [
  { label: "1,000", value: 1000 },
  { label: "2,000", value: 2000 },
  { label: "4,000", value: 4000 },
  { label: "5,000", value: 5000 },
  { label: "No Cap", value: NO_CAP_AMOUNT },
];

const DEFAULT_ALLOCATION = 2000;

const fmt = (n) => Number(n).toLocaleString("en-IN");

/**
 * "Set Campaign Scratches" — the campaign's scratch allocation, shared by
 * the launch wizard (after creating coupons) and the campaign page's
 * Allocate Scratches popup, so both look and behave the same.
 *
 *   • every coupon has a quantity → "Campaign Scratches Ready": the total is
 *     fixed at the coupons' quantities (lib/couponQuantityPlan.js)
 *   • otherwise → choose a total (field + chips + No Cap). Limited coupons
 *     reserve their quantity; the total can't go below that, nor below the
 *     scratches already used. The API enforces both.
 *
 * Always SETS the campaign's total (`targetTotal`), never adds to it.
 *
 * Props:
 *   - campaignId
 *   - enabled: load data (the host is open)
 *   - onAllocated(): after a successful save
 *   - onCancel(): Cancel button
 *   - onReview(): "Review Rewards" on the fixed screen (back to the coupons)
 */
export default function CampaignScratchesStep({ campaignId, enabled = true, onAllocated, onCancel, onReview }) {
  const { account } = useAuthContext();
  const userId = account?.id || account?._id;
  const userRole = account?.role || "Merchant";

  const { data: campaignJson, isPending: campaignLoading } = useCampaignQuery(campaignId, { enabled });
  const { data: rangesJson, isPending: rangesLoading } = useCampaignRangesQuery(campaignId, { enabled });
  const { data: subscription, isPending: subLoading } = useSubscriptionStatusQuery({ enabled });
  const loading = campaignLoading || rangesLoading || subLoading;
  const invalidateCluster = useInvalidateCampaignCluster();

  const currentAllocated = Number(campaignJson?.data?.allocated_scratch_cards) || 0;
  // used and redeemed are separate buckets; both count as consumed (matches
  // the floor in /api/campaigns/[id]/allocate-scratch).
  const usedScratches =
    (Number(campaignJson?.data?.used_scratch_cards) || 0) +
    (Number(campaignJson?.data?.redeemed_scratch_cards) || 0);

  const plan = useMemo(() => couponQuantityPlan(rangesJson?.ranges), [rangesJson]);
  const fixedTotal = requiredAllocation(plan, usedScratches);
  const isFixed = fixedTotal !== null;
  const minTotal = minimumAllocation(plan, usedScratches);
  const hasLimited = plan.limitedCount > 0;

  // "Coupon N" rows, numbered per bill range like the coupon editor; a
  // gift's own image as its icon.
  const couponGroups = useMemo(() => {
    const ranges = Array.isArray(rangesJson?.ranges) ? rangesJson.ranges : [];
    return ranges
      .map((r, ri) => ({
        key: String(r._id || ri),
        label: r.label || `₹${fmt(r.minAmount)} – ₹${fmt(r.maxAmount)}`,
        coupons: (Array.isArray(r.rewards) ? r.rewards : []).filter(Boolean).map((c, i) => ({
          key: String(c.rewardId || i),
          n: i + 1,
          qty: Number(c.totalQuantity) || 0,
          limited: c.quantityEnabled === true && Number(c.totalQuantity) > 0,
          remaining: Number(c.remainingQuantity ?? c.totalQuantity) || 0,
          isActive: c.isActive !== false,
          image:
            c.type === "gift" && typeof c.value === "string" && /^(data:image\/|https?:)/.test(c.value)
              ? c.value
              : null,
        })),
      }))
      .filter((g) => g.coupons.length > 0);
  }, [rangesJson]);
  const limitedCoupons = useMemo(
    () =>
      couponGroups.flatMap((g) =>
        g.coupons
          .filter((c) => c.limited)
          .map((c) => ({ ...c, key: `${g.key}-${c.key}`, rangeLabel: couponGroups.length > 1 ? g.label : null })),
      ),
    [couponGroups],
  );

  const isUnlimitedEntitlement =
    subscription?.unlimitedScratches === true || subscription?.scratchRemaining === "UNLIMITED";
  const scratchBalance = Number(subscription?.scratchRemaining) || 0;

  // The chosen NEW total ("" while the field is empty).
  const [allocation, setAllocation] = useState(DEFAULT_ALLOCATION);
  const [isNoCapSelected, setIsNoCapSelected] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState(null);

  // Start once the data is in: an existing campaign at its current total
  // (so Confirm stays off until something changes); a new one at 2,000, or
  // at the reserved minimum when the limited coupons need more than that.
  // Adjusted during render (not in an effect) so the first paint already has
  // the right number; re-seeds each time the host reopens.
  const [seeded, setSeeded] = useState(false);
  if (enabled && !loading && !seeded) {
    setSeeded(true);
    setIsNoCapSelected(false);
    setError(null);
    setAllocation(currentAllocated > 0 ? currentAllocated : Math.max(DEFAULT_ALLOCATION, minTotal));
  }
  if (!enabled && seeded) setSeeded(false);

  const isUnlimitedCap = isNoCapSelected && isUnlimitedEntitlement;
  const chosenTotal = Number(allocation) || 0;
  const tooLow = !isUnlimitedCap && chosenTotal < minTotal && minTotal > 0;
  const target = isFixed ? fixedTotal : chosenTotal;
  const isUnchanged = currentAllocated > 0 && target === currentAllocated;

  const handleSelectChip = useCallback((value) => {
    setError(null);
    if (value === NO_CAP_AMOUNT) {
      setIsNoCapSelected(true);
      setAllocation(
        isUnlimitedEntitlement
          ? Math.max(NO_CAP_AMOUNT, currentAllocated)
          : currentAllocated + scratchBalance,
      );
      return;
    }
    setIsNoCapSelected(false);
    setAllocation(value);
  }, [isUnlimitedEntitlement, currentAllocated, scratchBalance]);

  const handleConfirm = useCallback(async () => {
    if (!(target > 0) || (!isFixed && tooLow)) return;
    setError(null);
    setAllocating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/allocate-scratch`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId || "",
          "x-user-role": userRole,
        },
        body: JSON.stringify({ targetTotal: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        invalidateCluster(campaignId);
        onAllocated?.();
      } else {
        setError(data?.error || data?.message || "Failed to allocate scratches.");
      }
    } catch {
      setError("Failed to allocate scratches.");
    } finally {
      setAllocating(false);
    }
  }, [target, isFixed, tooLow, campaignId, userId, userRole, invalidateCluster, onAllocated]);

  if (loading || !seeded) {
    return (
      <div className={styles.preparing} role="status">
        <div className={styles.gears} aria-hidden="true">
          <Settings className={styles.gearBig} size={64} strokeWidth={2.2} />
          <Settings className={styles.gearSmall} size={36} strokeWidth={2.4} />
        </div>
        <h2 className={styles.preparingTitle}>Preparing campaign allocation…</h2>
        <p className={styles.preparingText}>Checking reward quantities and setting up your campaign.</p>
      </div>
    );
  }

  const currentLine = currentAllocated > 0 && (
    <p className={styles.currentLine}>
      Currently {fmt(currentAllocated)} allocated{usedScratches > 0 ? ` · ${fmt(usedScratches)} used` : ""}
    </p>
  );
  const unchangedHint = isUnchanged && (
    <p className={styles.unchangedHint}>Same as the current allocation — no change.</p>
  );
  const errorBox = error && <div className={styles.errorBox}>{error}</div>;

  // ── Every coupon has a set quantity: nothing to choose ──
  if (isFixed) {
    return (
      <div className={styles.stepBody}>
        <header className={styles.readyHeader}>
          <span className={styles.readyIcon} aria-hidden="true">
            <Check size={22} strokeWidth={3} />
          </span>
          <h2 className={styles.readyTitle}>Campaign Scratches Ready</h2>
          <p className={styles.readySub}>
            We calculated your campaign scratches from the reward quantities you set.
          </p>
          {currentLine}
        </header>

        <div className={styles.readyTotal}>
          <span className={styles.readyTotalLabel}>Total Campaign Scratches</span>
          <span className={styles.readyTotalValue}>{fmt(fixedTotal)}</span>
        </div>

        <section className={styles.alloc} aria-label="Reward allocation">
          <h3 className={styles.allocHeading}>Reward Allocation</h3>
          {couponGroups.map((group) => (
            <div key={group.key} className={styles.allocGroup}>
              {couponGroups.length > 1 && <div className={styles.allocRange}>{group.label}</div>}
              <ul className={styles.allocList}>
                {group.coupons.map((c) => (
                  <li key={c.key} className={styles.allocRow}>
                    <CouponThumb image={c.image} />
                    <span className={styles.allocName}>
                      Coupon {c.n}
                      {!c.isActive && <span className={styles.allocTag}>Inactive</span>}
                    </span>
                    <span className={styles.allocQty}>{fmt(c.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className={styles.allocTotal}>
            <span>Total</span>
            <span>{fmt(plan.total)}</span>
          </div>
        </section>

        {fixedTotal > plan.total ? (
          <div className={styles.readyWarn}>
            <Info size={16} aria-hidden="true" />
            <span>
              {fmt(usedScratches)} scratches are already used, so the campaign keeps {fmt(fixedTotal)}.
            </span>
          </div>
        ) : (
          <div className={styles.readyNote}>
            <Info size={16} aria-hidden="true" />
            <span>No extra allocation needed.</span>
          </div>
        )}

        {unchangedHint}
        {errorBox}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleConfirm}
            disabled={allocating || isUnchanged}
          >
            {allocating ? "Saving…" : "Confirm & Continue"}
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={onReview} disabled={allocating}>
            Review Rewards
          </button>
        </div>
      </div>
    );
  }

  // ── Choose a total ──
  return (
    <div className={styles.stepBody}>
      <header className={styles.stepHeader}>
        <h2 className={styles.title}>Set Campaign Scratches</h2>
        <p className={styles.stepSub}>Choose how many customers can scratch in this campaign.</p>
        {currentLine}
      </header>

      <div className={styles.balanceCard}>
        <span className={`${styles.balanceIcon} ${isUnlimitedEntitlement ? styles.balanceIconInfinite : ""}`}>
          {isUnlimitedEntitlement ? <InfinityIcon size={22} /> : <Coins size={22} />}
        </span>
        <div>
          <div className={styles.balanceLabel}>Scratch Balance</div>
          <div className={styles.balanceValue}>
            {isUnlimitedEntitlement ? "Unlimited" : `${fmt(scratchBalance)} available`}
          </div>
        </div>
      </div>

      {!isNoCapSelected && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`scratch-total-${campaignId}`}>
            Total Scratches
          </label>
          <input
            id={`scratch-total-${campaignId}`}
            type="text"
            inputMode="numeric"
            className={`${styles.input} ${tooLow ? styles.inputError : ""}`}
            value={allocation === "" ? "" : fmt(chosenTotal)}
            aria-invalid={tooLow}
            aria-describedby={tooLow ? `scratch-too-low-${campaignId}` : undefined}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
              setIsNoCapSelected(false);
              setError(null);
              setAllocation(digits === "" ? "" : Number(digits));
            }}
          />
          {tooLow && (
            <div id={`scratch-too-low-${campaignId}`} className={styles.lowError} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <div>
                <strong>Campaign scratches are too low</strong>
                <span>
                  {minTotal > plan.reserved
                    ? `${fmt(usedScratches)} scratches are already used.`
                    : `You've already assigned ${fmt(plan.reserved)} fixed rewards.`}{" "}
                  Set at least {fmt(minTotal)} scratches.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.chips}>
        {CHIPS.map((chip) => {
          // A preset below the minimum can't be picked (and never shows as
          // selected, even if typed).
          const belowMin = chip.value !== NO_CAP_AMOUNT && chip.value < minTotal;
          const isActive =
            chip.value === NO_CAP_AMOUNT
              ? isNoCapSelected
              : !isNoCapSelected && !belowMin && chosenTotal === chip.value;
          return (
            <button
              key={chip.label}
              type="button"
              className={isActive ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => handleSelectChip(chip.value)}
              disabled={belowMin}
              aria-pressed={isActive}
            >
              {isActive && <Check size={14} className={styles.chipCheck} />}
              {chip.label}
            </button>
          );
        })}
      </div>

      {isNoCapSelected ? (
        <>
          <CapacityCard
            unlimited={isUnlimitedCap}
            title={isUnlimitedCap ? "Unlimited scratches" : `${fmt(chosenTotal)} customers`}
            text={
              isUnlimitedCap
                ? "Customers can keep scratching while this campaign is active."
                : "can scratch in this campaign."
            }
          />
          {hasLimited && (
            <section className={styles.alloc} aria-label="Quantity-limited rewards">
              <h3 className={styles.allocHeading}>Quantity-Limited Rewards</h3>
              <ul className={styles.allocList}>
                {limitedCoupons.map((c) => (
                  <li key={c.key} className={styles.allocRow}>
                    <CouponThumb image={c.image} />
                    <span className={styles.allocName}>
                      Coupon {c.n}
                      {c.rangeLabel && <span className={styles.allocTag}>{c.rangeLabel}</span>}
                    </span>
                    <span className={styles.allocAvail}>{fmt(c.remaining)} available</span>
                  </li>
                ))}
              </ul>
              <div className={styles.infoNote}>
                <Info size={16} aria-hidden="true" />
                <span>
                  {limitedCoupons.length === 1
                    ? `Once all ${fmt(limitedCoupons[0].remaining)} of Coupon ${limitedCoupons[0].n} are won, this reward will stop appearing. Other active rewards will continue.`
                    : "Once a reward's quantity is used up, it will stop appearing. Other active rewards will continue."}
                </span>
              </div>
            </section>
          )}
        </>
      ) : hasLimited ? (
        <section className={styles.alloc} aria-label="Reward allocation">
          <h3 className={styles.allocHeading}>Reward Allocation</h3>
          <ul className={styles.splitList}>
            <li className={styles.splitRow}>
              <span className={`${styles.splitIcon} ${styles.splitIconReserved}`}><Gift size={18} /></span>
              <div>
                <div className={styles.splitValue}>{fmt(plan.reserved)}</div>
                <div className={styles.splitText}>Reserved for quantity-limited rewards</div>
              </div>
            </li>
            <li className={styles.splitRow}>
              <span className={`${styles.splitIcon} ${styles.splitIconShared}`}><Shuffle size={18} /></span>
              <div>
                <div className={styles.splitValue}>{tooLow ? "—" : fmt(chosenTotal - plan.reserved)}</div>
                {!tooLow && <div className={styles.splitText}>Available for other rewards</div>}
              </div>
            </li>
            <li className={styles.splitRow}>
              <span className={`${styles.splitIcon} ${styles.splitIconTotal}`}><Layers size={18} /></span>
              <div>
                <div className={styles.splitValue}>
                  {tooLow ? `Minimum ${fmt(minTotal)} scratches` : fmt(chosenTotal)}
                </div>
                <div className={styles.splitText}>Total campaign scratches</div>
              </div>
            </li>
          </ul>
          {!tooLow && (
            <div className={styles.infoNote}>
              <Info size={16} aria-hidden="true" />
              <span>
                ScratchX will automatically distribute the remaining scratches across rewards without a quantity limit.
              </span>
            </div>
          )}
        </section>
      ) : (
        chosenTotal > 0 && (
          <CapacityCard title={`${fmt(chosenTotal)} customers`} text="can scratch in this campaign." />
        )
      )}

      {unchangedHint}
      {errorBox}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleConfirm}
          disabled={allocating || tooLow || chosenTotal <= 0 || isUnchanged}
        >
          {allocating ? "Saving…" : "Confirm & Continue"}
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={onCancel} disabled={allocating}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function CouponThumb({ image }) {
  return (
    <span className={styles.allocThumb}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- data-URL gift image
        <img src={image} alt="" />
      ) : (
        <Gift size={18} />
      )}
    </span>
  );
}

function CapacityCard({ unlimited = false, title, text }) {
  return (
    <div className={styles.capacityCard}>
      <span className={styles.capacityHeading}>Campaign Capacity</span>
      <div className={styles.capacityBody}>
        <span className={styles.capacityIcon}>
          {unlimited ? <InfinityIcon size={20} /> : <Users size={20} />}
        </span>
        <div>
          <div className={styles.capacityTitle}>{title}</div>
          <div className={styles.capacityText}>{text}</div>
        </div>
      </div>
    </div>
  );
}
