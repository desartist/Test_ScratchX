"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CountdownTimer from "@/components/customer/CountdownTimer";
import styles from "./page.module.css";

/**
 * Coupon Screen Page
 * Displays coupon details with expiry timer and redemption options
 * Can be reached after scratch reveal or from coupon history
 */
export default function CouponPage() {
  const router = useRouter();
  const params = useParams();

  const [couponId, setCouponId] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState(null);

  // Unwrap params and fetch coupon
  useEffect(() => {
    const fetchCoupon = async () => {
      try {
        const { couponId: id } = await params;
        setCouponId(id);

        // Fetch coupon details
        const response = await fetch(`/api/customer/coupon/${id}`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch coupon");
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load coupon");
        }

        setCoupon(data.data);
      } catch (err) {
        console.error("Failed to fetch coupon:", err);
        setError(err.message || "Failed to load coupon");
      } finally {
        setLoading(false);
      }
    };

    fetchCoupon();
  }, [params]);

  // Handle coupon redemption
  const handleRedeem = async () => {
    try {
      setRedeeming(true);
      setRedeemError(null);

      const response = await fetch("/api/customer/coupon/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to redeem coupon");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Redemption failed");
      }

      // Show success state
      setCoupon((prev) => ({
        ...prev,
        status: "redeemed",
        redeemedAt: new Date(),
      }));
    } catch (err) {
      console.error("Redemption error:", err);
      setRedeemError(err.message || "Failed to redeem coupon");
    } finally {
      setRedeeming(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading coupon...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !coupon) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Oops!</h2>
          <p>{error || "Coupon not found"}</p>
          <button className={styles.backButton} onClick={() => router.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Redeemed state
  if (coupon.status === "redeemed") {
    return (
      <div className={styles.container}>
        <div className={styles.redeemedState}>
          <div className={styles.redeemedIcon}>✓</div>
          <h2>Coupon Redeemed!</h2>
          <p className={styles.redeemedMessage}>
            You can now use this coupon at the billing counter
          </p>
          <div className={styles.couponDetails}>
            <p className={styles.couponTitle}>{coupon.couponTitle}</p>
            <p className={styles.couponValue}>{coupon.couponValue}</p>
          </div>
          <button className={styles.backButton} onClick={() => router.back()}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Active coupon state
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Your Coupon</h1>
          <p className={styles.subtitle}>Valid until used</p>
        </div>

        {/* Coupon Card */}
        <div className={styles.couponCard}>
          <div className={styles.couponHeader}>
            <h2 className={styles.couponTitle}>{coupon.couponTitle}</h2>
            <div className={styles.badge}>Active</div>
          </div>

          <div className={styles.couponValue}>
            <span className={styles.value}>{coupon.couponValue}</span>
            <span className={styles.type}>
              {coupon.couponType === "percentage" && "OFF"}
              {coupon.couponType === "flat" && "Discount"}
              {coupon.couponType === "gift" && "Gift"}
            </span>
          </div>

          {coupon.description && (
            <p className={styles.description}>{coupon.description}</p>
          )}

          {/* Expiry Timer */}
          <div className={styles.timerSection}>
            <CountdownTimer
              expiresAt={coupon.expiresAt}
              showLabel={true}
              size="medium"
              onExpired={() => {
                setCoupon((prev) => ({ ...prev, status: "expired" }));
              }}
            />
          </div>
        </div>

        {/* Terms Section */}
        <div className={styles.termsSection}>
          <h3 className={styles.termsTitle}>Terms & Conditions</h3>
          <ul className={styles.termsList}>
            <li>Valid only at participating stores</li>
            <li>Cannot be combined with other offers</li>
            <li>One coupon per transaction</li>
            <li>Expires at the end of campaign period</li>
          </ul>
        </div>

        {/* Error Message */}
        {redeemError && (
          <div className={styles.errorMessage}>{redeemError}</div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.redeemButton}
            onClick={handleRedeem}
            disabled={redeeming}
          >
            {redeeming ? "Processing..." : "🎉 Redeem Now"}
          </button>
          <button className={styles.backButton} onClick={() => router.back()}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
