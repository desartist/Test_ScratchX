"use client";
import React, { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";
import { ChevronDown, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import RewardPreviewCard from "@/components/dashboard/RewardPreviewCard";

export default function EditRangePageByCampaignID({ params }) {
  const router = useRouter();
  const { account } = useAuthContext();

  // State for unwrapped params
  const [campaignId, setCampaignId] = useState(null);
  const [rangeId, setRangeId] = useState(null);

  // Form state
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [coupons, setCoupons] = useState([]);

  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Unwrap params (Client Component)
  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setCampaignId(resolvedParams.id);
      setRangeId(resolvedParams.rangeId);
    }
    unwrapParams();
  }, [params]);

  // Fetch data with proper auth guard
  const fetchRange = useCallback(async () => {
    if (!account?.id) {
      setError("Not authenticated. Please log in.");
      return;
    }

    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/campaign_range?id=${campaignId}&rangeId=${rangeId || ""}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();
      if (data.success) {
        setMinAmount(data.ranges?.minAmount?.toString() || "");
        setMaxAmount(data.ranges?.maxAmount?.toString() || "");
        setCoupons(data.ranges?.rewards || []);
        setError(null);
      } else {
        setError(data.message || "Failed to load range configuration");
      }
    } catch (err) {
      const errorMessage = err.message || "Failed to load range configuration";
      setError(errorMessage);
      console.error("Failed to fetch range:", err);
    } finally {
      setLoading(false);
    }
  }, [account?.id, campaignId, rangeId]);

  // Load data when authenticated and params are available
  useEffect(() => {
    if (campaignId && account?.id) {
      fetchRange();
    }
  }, [campaignId, account?.id, fetchRange]);

  // Handle coupon change
  const handleCouponChange = (index, field, val) => {
    const updatedCoupons = [...coupons];
    updatedCoupons[index][field] = val;
    setCoupons(updatedCoupons);
  };

  // Remove coupon
  const handleRemoveCoupon = (index) => {
    const updatedCoupons = coupons.filter((_, i) => i !== index);
    setCoupons(updatedCoupons);
  };

  // Add new coupon
  const handleAddCoupon = () => {
    setCoupons([...coupons, { type: "Fixed Amount", value: "" }]);
  };

  // Get label for reward type
  const getLabelForType = (type) => {
    switch (type) {
      case "Percentage":
        return "Reward Percentage (%)";
      case "Gift":
        return "Reward Gift";
      case "Fixed Amount":
      default:
        return "Reward Amount (₹)";
    }
  };

  // Get placeholder for reward type
  const getPlaceholderForType = (type) => {
    switch (type) {
      case "Percentage":
        return "e.g. 7";
      case "Gift":
        return "e.g. T-Shirt";
      case "Fixed Amount":
      default:
        return "e.g. 100";
    }
  };

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!account?.id) {
        setError("Not authenticated. Please log in.");
        return;
      }

      if (!campaignId || !minAmount || !maxAmount || coupons.length === 0) {
        setError("Please fill in all required fields");
        return;
      }

      setSubmitLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const res = await fetch("/api/campaign_range", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            minAmount: parseInt(minAmount),
            maxAmount: parseInt(maxAmount),
            rewards: coupons,
            campaignId,
            rangeId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to save range configuration");
        }

        setSuccessMessage("Range configuration saved successfully!");

        // Redirect after showing success message
        setTimeout(() => {
          router.push(`/range/${campaignId}`);
        }, 1500);
      } catch (err) {
        const errorMessage = err.message || "Failed to save range configuration";
        setError(errorMessage);
        console.error("Failed to save range:", err);
      } finally {
        setSubmitLoading(false);
      }
    },
    [account?.id, campaignId, minAmount, maxAmount, coupons, rangeId, router]
  );

  // Handle cancel
  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        Loading range configuration...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleCancel}>
          <ChevronLeft size={20} />
        </button>
        <h1 className={styles.title}>Edit Range</h1>
      </div>

      {/* Error Message */}
      {error && <div className={styles.errorContainer}>{error}</div>}

      {/* Success Message */}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      {/* Two Column Content */}
      <div className={styles.content}>
        {/* Form Section - Left (60%) */}
        <div className={styles.formSection}>
          {/* Spending Range Section */}
          <div>
            <h2 className={styles.sectionTitle}>Spending Range</h2>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Min. Amount (₹)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Max Amount (₹)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="e.g. 499"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Reward Cards Section */}
          <div>
            <h2 className={styles.sectionTitle}>Reward Cards</h2>
            <p className={styles.sectionSubtitle}>
              Customers will receive one of these rewards after scratching
            </p>

            <div className={styles.couponSection}>
              {coupons.map((coupon, index) => (
                <div key={index} className={styles.couponCard}>
                  <h3 className={styles.couponTitle}>
                    Card {index + 1}
                    <button
                      className={styles.removeCouponBtn}
                      onClick={() => handleRemoveCoupon(index)}
                      type="button"
                    >
                      <Trash2 size={12} style={{ marginRight: "4px" }} />
                      Remove
                    </button>
                  </h3>
                  <div className={styles.row}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Reward Type</label>
                      <div className={styles.selectWrapper}>
                        <select
                          className={styles.select}
                          value={coupon.type || "Fixed Amount"}
                          onChange={(e) =>
                            handleCouponChange(index, "type", e.target.value)
                          }
                        >
                          <option value="Fixed Amount">Fixed Amount</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Gift">Gift</option>
                        </select>
                        <ChevronDown
                          size={16}
                          className={styles.selectIcon}
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        {getLabelForType(coupon.type)}
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder={getPlaceholderForType(coupon.type)}
                        value={coupon.value || ""}
                        onChange={(e) =>
                          handleCouponChange(index, "value", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Button */}
              <button
                className={styles.addCouponBtn}
                onClick={handleAddCoupon}
                type="button"
              >
                <Plus size={16} />
                Add Reward Card
              </button>
            </div>
          </div>
        </div>

        {/* Preview Section - Right (40%) */}
        <div className={styles.previewSection}>
          <RewardPreviewCard
            minAmount={minAmount}
            maxAmount={maxAmount}
            rewards={coupons}
            campaignName="ScratchX"
          />
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={styles.cancelButton}
          onClick={handleCancel}
          disabled={submitLoading}
          type="button"
        >
          Cancel
        </button>
        <button
          className={styles.saveButton}
          onClick={handleSubmit}
          disabled={
            submitLoading || !minAmount || !maxAmount || coupons.length === 0
          }
          type="button"
        >
          {submitLoading ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
