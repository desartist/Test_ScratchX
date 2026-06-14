"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Gift,
  X,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./RewardRanges.module.css";

// Ranges are uncapped per product rule ("create as many ranges as we want").
const MAX_RANGES = Infinity;

// Tolerantly read a reward's display fields regardless of stored shape.
function readReward(r) {
  if (!r || typeof r !== "object") return { name: "", value: "", winnerCount: null };
  const name = r.name ?? r.title ?? r.type ?? "";
  const value = r.value ?? r.amount ?? "";
  const winnerCount =
    r.winnerCount ?? r.winners ?? r.winner_count ?? r.count ?? null;
  return { name, value, winnerCount };
}

function emptyReward() {
  return { name: "", value: "", winnerCount: "" };
}

/**
 * RewardRanges
 *
 * Card-based management for a campaign's reward ranges (max 3).
 * Reads GET /api/campaign_range?id={campaignId} and writes via
 * POST /api/campaign_range (create + edit via rangeId) and
 * DELETE /api/campaign_range?rangeId=.
 *
 * Props:
 *  - campaignId: string
 *  - onChanged: () => void  (refetch price range + QR checklist on the page)
 *  - manageHref?: string  (when provided, ranges render READ-ONLY and Add/Edit
 *      navigate to this href instead of opening the inline editor/modal)
 */
export default function RewardRanges({ campaignId, onChanged, manageHref }) {
  const router = useRouter();
  const { account } = useAuthContext();
  const userId = account?.id;
  const userRole = account?.role || "Merchant";

  const manageMode = !!manageHref;

  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state (shared between add + edit). editingId === null => create.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [rewards, setRewards] = useState([emptyReward()]);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userId || "",
      "x-user-role": userRole,
    }),
    [userId, userRole],
  );

  const fetchRanges = useCallback(async () => {
    if (!campaignId || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaign_range?id=${campaignId}`, {
        method: "GET",
        credentials: "include",
        headers: { "x-user-id": userId, "x-user-role": userRole },
      });
      const data = await res.json();
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
  }, [campaignId, userId, userRole]);

  useEffect(() => {
    fetchRanges();
  }, [fetchRanges]);

  const limitReached = ranges.length >= MAX_RANGES;

  const resetForm = useCallback(() => {
    setEditingId(null);
    setMinAmount("");
    setMaxAmount("");
    setRewards([emptyReward()]);
    setFormError(null);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  // In manage mode, Add/Edit redirect to the dedicated ranges page.
  const goManage = useCallback(() => {
    if (manageHref) router.push(manageHref);
  }, [router, manageHref]);

  const openEdit = useCallback((range) => {
    setEditingId(range._id);
    setMinAmount(String(range.minAmount ?? ""));
    setMaxAmount(String(range.maxAmount ?? ""));
    const existing = Array.isArray(range.rewards) ? range.rewards : [];
    setRewards(
      existing.length > 0
        ? existing.map((r) => {
            const { name, value, winnerCount } = readReward(r);
            return {
              name: String(name ?? ""),
              value: value === "" || value == null ? "" : String(value),
              winnerCount:
                winnerCount === "" || winnerCount == null
                  ? ""
                  : String(winnerCount),
            };
          })
        : [emptyReward()],
    );
    setFormError(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    resetForm();
  }, [resetForm]);

  const handleRewardChange = useCallback((index, field, val) => {
    setRewards((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: val } : r)),
    );
  }, []);

  const addRewardRow = useCallback(() => {
    setRewards((prev) => [...prev, emptyReward()]);
  }, []);

  const removeRewardRow = useCallback((index) => {
    setRewards((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError(null);

      const min = Number(minAmount);
      const max = Number(maxAmount);

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        setFormError("Enter valid min and max amounts.");
        return;
      }
      if (max < min) {
        setFormError("Max amount must be greater than or equal to min amount.");
        return;
      }

      const cleaned = [];
      for (const r of rewards) {
        const name = (r.name || "").trim();
        const value = Number(r.value);
        const winnerCount = Number(r.winnerCount);
        if (!name) {
          setFormError("Each reward needs a name.");
          return;
        }
        if (!Number.isFinite(value) || value <= 0) {
          setFormError("Reward value must be greater than 0.");
          return;
        }
        if (!Number.isFinite(winnerCount) || winnerCount <= 0) {
          setFormError("Winner count must be greater than 0.");
          return;
        }
        cleaned.push({ name, value, winnerCount });
      }

      if (cleaned.length === 0) {
        setFormError("Add at least one reward.");
        return;
      }

      setSaving(true);
      try {
        const body = {
          minAmount: min,
          maxAmount: max,
          rewards: cleaned,
          campaignId,
        };
        if (editingId) body.rangeId = editingId;

        const res = await fetch("/api/campaign_range", {
          method: "POST",
          credentials: "include",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          setFormError(
            data?.error ||
              data?.message ||
              "Failed to save range. You may have reached your plan limit.",
          );
          return;
        }

        closeForm();
        await fetchRanges();
        if (typeof onChanged === "function") onChanged();
      } catch (err) {
        console.error("Failed to save range:", err);
        setFormError("Failed to save range.");
      } finally {
        setSaving(false);
      }
    },
    [
      minAmount,
      maxAmount,
      rewards,
      campaignId,
      editingId,
      authHeaders,
      closeForm,
      fetchRanges,
      onChanged,
    ],
  );

  const handleDelete = useCallback(
    async (rangeId) => {
      if (!rangeId) return;
      setDeletingId(String(rangeId));
      setError(null);
      try {
        const res = await fetch(
          `/api/campaign_range?rangeId=${rangeId}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { "x-user-id": userId || "", "x-user-role": userRole },
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
          throw new Error(data?.error || "Failed to delete range");
        }
        await fetchRanges();
        if (typeof onChanged === "function") onChanged();
      } catch (err) {
        console.error("Failed to delete range:", err);
        setError(err.message || "Failed to delete range");
      } finally {
        setDeletingId(null);
      }
    },
    [userId, userRole, fetchRanges, onChanged],
  );

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Tag size={20} />
          <h2 className={styles.title}>Reward Ranges</h2>
        </div>
        <span className={styles.counter}>
          {ranges.length} {ranges.length === 1 ? "range" : "ranges"}
        </span>
      </div>

      <p className={styles.note}>
        Define spend ranges and the rewards customers can win in each.
      </p>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading ? (
        <div className={styles.stateMsg}>Loading reward ranges…</div>
      ) : ranges.length === 0 && !formOpen ? (
        <div className={styles.stateMsg}>
          No reward ranges yet. Add one to get started.
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {ranges.map((range) => {
            const rewardItems = Array.isArray(range.rewards)
              ? range.rewards
              : [];
            return (
              <div key={range._id} className={styles.rangeCard}>
                <div className={styles.rangeCardTop}>
                  <span className={styles.rangeLabel}>
                    {range.label || `₹${range.minAmount} - ₹${range.maxAmount}`}
                  </span>
                  <div className={styles.rangeActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => (manageMode ? goManage() : openEdit(range))}
                      title="Edit range"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtnDanger}
                      onClick={() => handleDelete(range._id)}
                      disabled={deletingId === String(range._id)}
                      title="Delete range"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.rewardRow}>
                  <Gift size={14} className={styles.rewardIcon} />
                  <span className={styles.rewardName}>
                    {rewardItems.length} reward
                    {rewardItems.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {manageMode ? (
        <div className={styles.addRow}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={goManage}
          >
            <Plus size={16} />
            {ranges.length > 0 ? "Manage Ranges" : "Add Range"}
          </button>
        </div>
      ) : (
        !formOpen && (
          <div className={styles.addRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openAdd}
              disabled={limitReached}
            >
              <Plus size={16} />
              Add Range
            </button>
            {limitReached && (
              <span className={styles.limitNote}>
                Maximum {MAX_RANGES} ranges
              </span>
            )}
          </div>
        )
      )}

      {!manageMode && formOpen && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>
              {editingId ? "Edit Range" : "Add Range"}
            </h3>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={closeForm}
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Min Amount (₹)</label>
              <input
                type="number"
                className={styles.input}
                placeholder="e.g. 500"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Max Amount (₹)</label>
              <input
                type="number"
                className={styles.input}
                placeholder="e.g. 999"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.rewardsEditor}>
            <span className={styles.label}>Rewards</span>
            {rewards.map((r, index) => (
              <div key={index} className={styles.rewardEditRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Reward name"
                  value={r.name}
                  onChange={(e) =>
                    handleRewardChange(index, "name", e.target.value)
                  }
                />
                <input
                  type="number"
                  className={styles.inputSm}
                  placeholder="Value (₹)"
                  value={r.value}
                  onChange={(e) =>
                    handleRewardChange(index, "value", e.target.value)
                  }
                />
                <input
                  type="number"
                  className={styles.inputSm}
                  placeholder="Winners"
                  value={r.winnerCount}
                  onChange={(e) =>
                    handleRewardChange(index, "winnerCount", e.target.value)
                  }
                />
                <button
                  type="button"
                  className={styles.iconBtnDanger}
                  onClick={() => removeRewardRow(index)}
                  disabled={rewards.length <= 1}
                  title="Remove reward"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.addRewardBtn}
              onClick={addRewardRow}
            >
              <Plus size={14} />
              Add Reward
            </button>
          </div>

          {formError && <div className={styles.errorBox}>{formError}</div>}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving}
            >
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Range"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
