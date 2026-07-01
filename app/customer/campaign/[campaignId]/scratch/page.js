"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import CanvasScratchCard from "@/components/customer/CanvasScratchCard";
import styles from "./page.module.css";

export default function ScratchCouponGridPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const campaignId = params.campaignId;
  const participationId = searchParams.get('participationId');

  // State management
  const [campaignData, setCampaignData] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Check existing participation status and redirect if already scratched/revealed
  useEffect(() => {
    if (!participationId) return;
    fetch(`/api/customer/participation/${participationId}`)
      .then((r) => r.json())
      .then((result) => {
        if (!result.success) return;
        const st = result.data?.status;
        if (st === 'revealed' || st === 'redeemed' || st === 'scratched') {
          router.replace(`/customer/campaign/${campaignId}/scratch/${participationId}`);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participationId, campaignId]);

  // Fetch campaign data on mount
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/customer/campaign/${campaignId}`
        );
        const result = await response.json();

        if (!result.success) {
          setError(result.error || "Failed to load campaign");
          return;
        }

        setCampaignData(result.data);

        // Extract coupons from ranges
        const extractedCoupons = [];
        if (result.data.ranges && Array.isArray(result.data.ranges)) {
          result.data.ranges.forEach((range) => {
            if (range.rewards && Array.isArray(range.rewards)) {
              range.rewards.forEach((reward, index) => {
                // Create a coupon object with unique ID
                extractedCoupons.push({
                  id: `${range._id}-${index}`,
                  rangeId: range._id,
                  amount: reward.value || "0",
                  type: reward.type || "reward",
                  description: reward.description || "",
                  reward: reward,
                });
              });
            }
          });
        }

        setCoupons(extractedCoupons);
        setError(null);
      } catch (err) {
        console.error("Error fetching campaign:", err);
        setError("Failed to load campaign. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchCampaignData();
    }
  }, [campaignId]);

  // Handle coupon selection
  const handleSelectCoupon = (coupon) => {
    setSelectedCoupon(coupon.id === selectedCoupon ? null : coupon.id);
  };

  // Handle proceed to scratch
  const handleProceedToScratch = async () => {
    if (!selectedCoupon) {
      setError("Please select a coupon first");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Find the selected coupon object
      const couponObject = coupons.find((c) => c.id === selectedCoupon);

      if (!couponObject) {
        setError("Selected coupon not found");
        return;
      }

      // Navigate to individual scratch card page with participation info
      router.push(
        `/customer/campaign/${campaignId}/scratch/${participationId}?couponId=${couponObject.id}&rangeId=${couponObject.rangeId}`
      );
    } catch (err) {
      console.error("Error processing coupon selection:", err);
      setError("Failed to process selection. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Get store badge text (initials or name)
  const getStoreBadgeText = () => {
    if (
      campaignData?.campaign?.storeId?.storeName
    ) {
      const name = campaignData.campaign.storeId.storeName;
      return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "ST";
  };

  // Get store name
  const getStoreName = () => {
    return (
      campaignData?.campaign?.storeId?.storeName || "Store"
    );
  };

  // Get campaign offer name
  const getOfferName = () => {
    return campaignData?.campaign?.campaignName || "Campaign";
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <div className={styles.loader}>Loading coupons...</div>
        </div>
      </div>
    );
  }

  if (error && !campaignData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.errorContainer}>
            <h2>Error Loading Campaign</h2>
            <p>{error}</p>
            <button
              className={styles.backButton}
              onClick={() => router.back()}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with Store Badge */}
      <header className={styles.header}>
        <div className={styles.storeBadge}>{getStoreBadgeText()}</div>
        <div className={styles.storeInfo}>
          <h2 className={styles.storeName}>{getStoreName()}</h2>
          <p className={styles.offerName}>{getOfferName()}</p>
        </div>
      </header>

      {/* Title Section */}
      <section className={styles.titleSection}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>Pick your lucky coupon</h1>
          <p className={styles.subtitle}>You can scratch only one</p>
          <div className={styles.couponCountSection}>
            <span>Total coupons available:</span>
            <span className={styles.couponCountBadge}>{coupons.length}</span>
          </div>
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "4px",
            margin: "0 20px 16px 20px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* Coupon Grid with Canvas-based Scratch Cards */}
      {coupons.length > 0 ? (
        <div className={styles.gridContainer}>
          {coupons.map((coupon) => (
            <CanvasScratchCard
              key={coupon.id}
              coupon={coupon}
              onSelect={handleSelectCoupon}
              isSelected={selectedCoupon === coupon.id}
              disabled={false}
            />
          ))}
        </div>
      ) : (
        <div className={styles.loadingContainer}>
          <p>No coupons available for this campaign</p>
        </div>
      )}

      {/* Proceed Button */}
      {coupons.length > 0 && (
        <div
          style={{
            padding: "20px",
            display: "flex",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              padding: "12px 24px",
              backgroundColor: "#e8e8e8",
              color: "#010f44",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#d0d0d0")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#e8e8e8")}
          >
            Back
          </button>
          <button
            onClick={handleProceedToScratch}
            disabled={!selectedCoupon || submitting}
            style={{
              padding: "12px 24px",
              backgroundColor: selectedCoupon ? "#010f44" : "#cccccc",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: selectedCoupon ? "pointer" : "not-allowed",
              transition: "background-color 0.2s ease",
              opacity: submitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (selectedCoupon) {
                e.target.style.backgroundColor = "#1a1f5a";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCoupon) {
                e.target.style.backgroundColor = "#010f44";
              }
            }}
          >
            {submitting ? "Processing..." : "Proceed to Scratch"}
          </button>
        </div>
      )}
    </div>
  );
}
