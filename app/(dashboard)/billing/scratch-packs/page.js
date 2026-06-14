"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";
import { Check, AlertCircle, Clock } from "lucide-react";
import styles from "./page.module.css";

export default function ScratchPacksPage() {
  const { account } = useAuthContext();
  const router = useRouter();
  const [packs, setPacks] = useState([]);
  const [scratchStatus, setScratchStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch scratch status
        const statusRes = await fetch("/api/billing/scratch-status", {
          credentials: "include",
        });
        const statusData = await statusRes.json();
        if (statusData.success) {
          setScratchStatus(statusData.data);
        }

        // Fetch available scratch packs
        const packsRes = await fetch("/api/billing/scratch-packs", {
          credentials: "include",
        });
        const packsData = await packsRes.json();
        if (packsData.success) {
          setPacks(packsData.packs);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load scratch packs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (account?.id) {
      fetchData();
    }
  }, [account?.id]);

  const handlePurchase = async (pack) => {
    try {
      setPurchasing(pack._id);
      setError(null);

      const response = await fetch("/api/billing/purchase-scratch-pack", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packId: pack._id,
          quantity: pack.quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Purchase failed");
      }

      // Update scratch status
      setScratchStatus(data.scratchStatus);

      // Show success message
      alert(`✓ ${data.message}`);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Purchase error:", err);
      setError(err.message || "Failed to purchase scratch pack");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p>Loading scratch packs...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Purchase Scratches</h1>
        <p className={styles.subtitle}>
          Choose a scratch pack to continue using ScratchX
        </p>
      </div>

      {/* Current Status */}
      {scratchStatus && (
        <div className={`${styles.statusCard} ${styles[`status-${scratchStatus.status}`]}`}>
          <div className={styles.statusHeader}>
            {scratchStatus.status === "expired" ? (
              <AlertCircle size={20} />
            ) : (
              <Clock size={20} />
            )}
            <div>
              <p className={styles.statusTitle}>Current Status</p>
              <p className={styles.statusValue}>{scratchStatus.displayLabel}</p>
            </div>
          </div>
          <p className={styles.statusDetail}>{scratchStatus.displayDetail}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={16} />
          <p>{error}</p>
        </div>
      )}

      {/* Scratch Packs Grid */}
      <div className={styles.packs}>
        {packs.map((pack) => (
          <div key={pack._id} className={styles.packCard}>
            {pack.isBestValue && <span className={styles.badge}>Best Value</span>}
            {pack.isPopular && <span className={styles.badge}>Most Popular</span>}

            <div className={styles.packHeader}>
              <h3 className={styles.packName}>{pack.quantity.toLocaleString()}</h3>
              <p className={styles.packSize}>Scratches</p>
            </div>

            <div className={styles.pricing}>
              {pack.discount?.percentage > 0 && (
                <div className={styles.discount}>
                  <span className={styles.discountBadge}>
                    {pack.discount.percentage}% OFF
                  </span>
                </div>
              )}
              <p className={styles.price}>
                ₹{(pack.price.amount / 100).toLocaleString()}
              </p>
              {pack.discount?.percentage > 0 && (
                <p className={styles.originalPrice}>
                  ₹{(
                    (pack.price.amount + pack.discount.amountSaved) /
                    100
                  ).toLocaleString()}
                </p>
              )}
            </div>

            <div className={styles.costPerUnit}>
              ₹{(pack.costPerUnit / 100).toFixed(4)} per scratch
            </div>

            <div className={styles.validity}>
              <Clock size={14} />
              <span>Valid for {pack.validityDays} days</span>
            </div>

            <button
              onClick={() => handlePurchase(pack)}
              disabled={purchasing === pack._id}
              className={styles.purchaseBtn}
            >
              {purchasing === pack._id ? (
                <>
                  <span className={styles.spinner} />
                  Processing...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Purchase Now
                </>
              )}
            </button>

            <p className={styles.disclaimer}>
              This is a temporary direct purchase. Razorpay integration coming soon.
            </p>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {packs.length === 0 && !loading && (
        <div className={styles.empty}>
          <AlertCircle size={48} />
          <p className={styles.emptyText}>No scratch packs available</p>
          <p className={styles.emptySubtext}>Please contact support for assistance</p>
        </div>
      )}
    </div>
  );
}
