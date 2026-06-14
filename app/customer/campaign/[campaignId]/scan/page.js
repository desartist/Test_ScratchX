"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import styles from "./page.module.css";

export default function ScanClientPage() {
  const { campaignId } = useParams();

  // Campaign & Ranges State
  const [campaign, setCampaign] = useState(null);
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchedStore, setMatchedStore] = useState(null);

  // Step State: FORM, PICK, REVEAL
  const [step, setStep] = useState("FORM");

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    customerMobile: "",
    selectedRange: "",
  });
  const [validationErrors, setValidationErrors] = useState({});

  // Location State
  const [customerLocation, setCustomerLocation] = useState({
    latitude: null,
    longitude: null,
  });
  const [locationVerifying, setLocationVerifying] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);

  // Coupon & Reward State
  const [selectedCouponIndex, setSelectedCouponIndex] = useState(null);
  const [assignedReward, setAssignedReward] = useState(null);
  const [scratched, setScratched] = useState(false);
  const [participationId, setParticipationId] = useState(null);
  const [scratchCardId, setScratchCardId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch campaign on mount
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customer/campaign/${campaignId}`);
        const result = await response.json();

        if (!result.success) {
          setError(result.message || "Failed to load campaign");
          return;
        }
        setCampaign(result.data.campaign);
        setRanges(result.data.ranges || []);
      } catch (err) {
        setError("Error loading campaign: " + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
      await getCustomerLocation()
    };

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  // ===== FORM VALIDATION =====
  const validateForm = () => {
    const errors = {};

    if (!formData.customerName.trim()) {
      errors.customerName = "Name is required";
    }

    if (!formData.customerMobile.trim()) {
      errors.customerMobile = "Mobile is required";
    } else if (!/^[0-9]{10}$/.test(formData.customerMobile)) {
      errors.customerMobile = "Mobile must be 10 digits";
    }

    if (!formData.selectedRange) {
      errors.selectedRange = "Select a billing range";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== LOCATION CAPTURE =====
  const getCustomerLocation = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation not supported");
        resolve(false);
        return;
      }

      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomerLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          console.log("✅ Location captured:", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          resolve(true);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Enable location services and try again");
          resolve(false);
        },
        { timeout: 10000 }
      );
    });
  };

  // ===== BUTTON 1: VERIFY LOCATION =====
  const handleVerifyLocation = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLocationVerifying(true);
    setLocationError(null);

    try {
      // Get location if not already captured
      if (!customerLocation.latitude || !customerLocation.longitude) {
        const hasLocation = await getCustomerLocation();
        if (!hasLocation) {
          setLocationError("Enable GPS and try again");
          setLocationVerifying(false);
          return;
        }
      }

      // Call location-verify API
      const storesList = campaign?.assignedStores;
      if (!storesList || storesList.length === 0) {
        setLocationError("Store info not found");
        setLocationVerifying(false);
        return;
      }

      console.log("📍 Verifying location with API...");

      const response = await fetch(`/api/customer/location-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          storesList,
          customerLatitude: customerLocation.latitude,
          customerLongitude: customerLocation.longitude,
        }),
      });

      const result = await response.json();
      console.log("✅ Location-verify response:", result);

      if (!result.success || !result.data?.isValid) {
        setLocationError(
          `You must be within ${result.data?.allowedRadius}m of the store. Current distance: ${Math.round(result.data?.distance || 0)}m`
        );
        setLocationVerifying(false);
        return;
      }

      // Success: Store the matched store and mark as verified
      setMatchedStore(result.data?.matchedStore);
      setLocationVerified(true);
      setLocationError(null);
      console.log("✅ Location verified successfully!");
      console.log("🏪 Matched store:", result.data?.matchedStore);
    } catch (err) {
      console.error("Location verification error:", err);
      setLocationError("Failed to verify location. Please try again.");
    } finally {
      setLocationVerifying(false);
    }
  };

  // ===== BUTTON 2: SHOW MY COUPONS (Only after location verified) =====
  const handleShowCoupons = async (e) => {
    e.preventDefault();

    if (!matchedStore || !locationVerified) {
      setError("Please verify your location first");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log("📤 Calling participate API with matchedStore:", matchedStore);

      if (!matchedStore || !matchedStore.storeId) {
        setError("Store verification failed. Please try again.");
        return;
      }

      // IMPORTANT: Send ONLY the verified store from location-verify API
      // DO NOT send storesList - we trust ONLY the verified store
      const response = await fetch(`/api/customer/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          rangeId: formData.selectedRange,
          customerName: formData.customerName.trim(),
          customerMobile: formData.customerMobile.trim(),
          customerEmail: null,
          billAmount: 0,
          customerLatitude: customerLocation.latitude,
          customerLongitude: customerLocation.longitude,
          customerConsent: true,
          verifiedStore: matchedStore  // ONLY verified store from location-verify API
        }),
      });

      const result = await response.json();
      console.log("✅ Participate API response:", result);

      if (!result.success) {
        setError(result.error || "Failed to participate");
        return;
      }

      // Success: Move to scratch selection with actual reward
      setParticipationId(result.data.participation._id);
      setScratchCardId(result.data.scratchCardId);
      // Store the actual reward allocated by backend
      if (result.data.reward) {
        setAssignedReward({
          type: result.data.reward.type || 'Discount',
          value: result.data.reward.value || result.data.reward.description,
          description: result.data.reward.description
        });
      }
      setStep("PICK");
    } catch (err) {
      console.error("Error submitting participation:", err);
      setError("Failed to participate. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== COUPON SELECTION (STEP 2 -> STEP 3) =====
  const handlePickCoupon = (index) => {
    setSelectedCouponIndex(index);

    // Use actual reward allocated by backend during participation
    // If assignedReward is not set, use a default (shouldn't happen if API works)
    if (!assignedReward) {
      // Fallback only if backend didn't return reward (error case)
      const rewards = ["₹50", "₹100", "₹150", "₹200", "₹250", "₹300"];
      const selectedReward = rewards[index % rewards.length];
      setAssignedReward({
        type: "Flat",
        value: selectedReward,
      });
    }

    setStep("REVEAL");
  };

  // ===== SCRATCH REVEAL (STEP 3) =====
  const handleScratch = () => {
    if (scratched) return;

    setScratched(true);

    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff0055", "#00ccff", "#ff9900", "#cc00ff"],
    });
  };

  // ===== RENDER LOADING STATE =====
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner}></div>
        <p>Loading campaign...</p>
      </div>
    );
  }

  // ===== RENDER ERROR STATE =====
  if (error && !campaign) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <h2>❌ Campaign Not Available</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <h2>Campaign Not Found</h2>
          <p>The campaign you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // ===== RENDER STEPS =====

  // STEP 1: FORM WITH TWO BUTTONS
  if (step === "FORM") {
    return (
      <div className={styles.container}>
        {/* Business Info Header */}
        <header className={styles.header}>
          <div className={styles.logoIcon}>BS</div>
          <div className={styles.storeInfo}>
            <span className={styles.storeName}>{campaign.campaignName || "Store"}</span>
            <span className={styles.storeSubtitle}>{campaign.description || "Special Offer"}</span>
          </div>
        </header>

        {/* Form Container */}
        <div className={styles.formContainer}>
          <h1 className={styles.title}>Unlock Your Reward</h1>
          <p className={styles.subtitle}>
            Please enter your details to scratch & win exclusive offers
          </p>

          {error && <div className={styles.errorAlert}>{error}</div>}
          {locationError && <div className={styles.warningAlert}>{locationError}</div>}

          <form>
            {/* Name Field */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Your Name</label>
              <input
                type="text"
                className={`${styles.input} ${validationErrors.customerName ? styles.inputError : ""}`}
                placeholder="Nimit"
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({ ...formData, customerName: e.target.value });
                  if (validationErrors.customerName) {
                    setValidationErrors({ ...validationErrors, customerName: null });
                  }
                }}
              />
              {validationErrors.customerName && (
                <span className={styles.errorText}>{validationErrors.customerName}</span>
              )}
            </div>

            {/* Mobile Field */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Contact Number</label>
              <div className={styles.mobileInputWrapper}>
                <span className={styles.phonePrefix}>+91</span>
                <input
                  type="tel"
                  className={`${styles.input} ${styles.mobileInput} ${validationErrors.customerMobile ? styles.inputError : ""}`}
                  placeholder="9099321133"
                  maxLength="10"
                  value={formData.customerMobile}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, customerMobile: value });
                    if (validationErrors.customerMobile) {
                      setValidationErrors({ ...validationErrors, customerMobile: null });
                    }
                  }}
                />
              </div>
              {validationErrors.customerMobile && (
                <span className={styles.errorText}>{validationErrors.customerMobile}</span>
              )}
            </div>

            {/* Range Selection */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Select your purchase range</label>
              <div className={styles.radioGroup}>
                {ranges.map((range) => (
                  <label
                    key={range._id}
                    className={`${styles.radioLabel} ${formData.selectedRange === range._id ? styles.selected : ""}`}
                  >
                    <input
                      type="radio"
                      name="purchaseRange"
                      value={range._id}
                      checked={formData.selectedRange === range._id}
                      onChange={() => {
                        setFormData({ ...formData, selectedRange: range._id });
                        if (validationErrors.selectedRange) {
                          setValidationErrors({ ...validationErrors, selectedRange: null });
                        }
                      }}
                      className={styles.radioInput}
                    />
                    ₹{range.minAmount} - ₹{range.maxAmount}
                  </label>
                ))}
              </div>
              {validationErrors.selectedRange && (
                <span className={styles.errorText}>{validationErrors.selectedRange}</span>
              )}
            </div>

            {/* Location Status */}
            {locationVerified ? (
              <div className={styles.successAlert}>
                ✓ Location verified! You're at {matchedStore?.storeName}
              </div>
            ) : (
              <div className={styles.infoAlert}>
                📍 Please verify your location first
              </div>
            )}

            {/* BUTTON 1: Verify Location (always visible) */}
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleVerifyLocation}
              disabled={locationVerifying}
            >
              {locationVerifying ? "Verifying Location..." : "📍 Verify Location"}
            </button>

            {/* BUTTON 2: Show My Coupons (only after location verified) */}
            {locationVerified && (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleShowCoupons}
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Show My Coupons"}
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // STEP 2: PICK COUPON
  if (step === "PICK") {
    return (
      <div className={styles.container}>
        {/* Business Info Header */}
        <header className={styles.header}>
          <div className={styles.logoIcon}>BS</div>
          <div className={styles.storeInfo}>
            <span className={styles.storeName}>{campaign.campaignName || "Store"}</span>
            <span className={styles.storeSubtitle}>{campaign.description || "Special Offer"}</span>
          </div>
        </header>

        {/* Coupon Grid Container */}
        <div className={styles.gridContainer}>
          <h1 className={styles.title} style={{ marginTop: 0 }}>
            Pick your lucky coupon
          </h1>
          <p className={styles.subtitle}>You can scratch only one</p>

          <div className={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((item, idx) => (
              <div
                key={item}
                className={styles.couponCard}
                onClick={() => handlePickCoupon(idx)}
              >
                <div className={styles.giftIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 12 20 22 4 22 4 12"></polyline>
                    <rect x="2" y="7" width="20" height="5"></rect>
                    <line x1="12" y1="22" x2="12" y2="7"></line>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: REVEAL
  if (step === "REVEAL") {
    return (
      <div className={styles.container}>
        {/* Business Info Header */}
        <header className={styles.header}>
          <div className={styles.logoIcon}>BS</div>
          <div className={styles.storeInfo}>
            <span className={styles.storeName}>{campaign.campaignName || "Store"}</span>
            <span className={styles.storeSubtitle}>{campaign.description || "Special Offer"}</span>
          </div>
        </header>

        {/* Reveal Card Container */}
        <div className={styles.revealContainer}>
          <div
            className={`${styles.revealCard} ${scratched ? styles.scratched : ""}`}
            onClick={handleScratch}
          >
            {!scratched ? (
              <>
                <div className={styles.giftIcon} style={{ width: 80, height: 80 }}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 12 20 22 4 22 4 12"></polyline>
                    <rect x="2" y="7" width="20" height="5"></rect>
                    <line x1="12" y1="22" x2="12" y2="7"></line>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                  </svg>
                </div>
                <span className={styles.scratchText}>Scratch Your Coupon</span>
              </>
            ) : (
              <div className={styles.rewardContent}>
                <div className={styles.rewardPrefix}>You won prize of</div>
                <div className={styles.rewardValue}>{assignedReward?.value}</div>
                <div
                  className={styles.giftIcon}
                  style={{
                    width: 60,
                    height: 60,
                    margin: "10px auto 0",
                    backgroundColor: "#ff9800",
                  }}
                >
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                  >
                    <polyline points="20 12 20 22 4 22 4 12"></polyline>
                    <rect x="2" y="7" width="20" height="5"></rect>
                    <line x1="12" y1="22" x2="12" y2="7"></line>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                  </svg>
                </div>
              </div>
            )}
          </div>

          {scratched && (
            <button
              className={styles.redeemBtn}
              onClick={() => {
                // Navigate to redemption page
                window.location.href = `/customer/campaign/${campaignId}/scratch/${scratchCardId}?participationId=${participationId}`;
              }}
            >
              Redeem Prize
            </button>
          )}
        </div>
      </div>
    );
  }
}
