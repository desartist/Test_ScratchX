"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import LocationStatus from "@/components/customer/LocationStatus";
import styles from "./page.module.css";

export default function ScanClientPage() {
  const { campaignId } = useParams();
  const router = useRouter();

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
      await getCustomerLocation();
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

  // ===== LOCATION VERIFICATION =====
  const getCustomerLocation = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation not supported");
        resolve(false);
        return;
      }

      // setLocationVerifying(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomerLocation({
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
        { timeout: 10000 },
      );
    });
  };

  const verifyLocationWithStore = async (latitude, longitude) => {
    try {
      setLocationVerifying(true);
      setLocationError(null);

      const storesList = campaign?.assignedStores;
      if (!storesList || storesList.length === 0) {
        setLocationError("Store info not found");
        setLocationVerifying(false);
        return { success: false, matchedStore: null };
      }

      const response = await fetch(`/api/customer/location-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          storesList,
          customerLatitude: latitude,
          customerLongitude: longitude,
        }),
      });

      const result = await response.json();
      console.log(result, "location result");
      if (!result.success || !result.data.isValid) {
        // Build detailed error message showing all store distances
        let errorMsg = result.data?.message ||
          `You must be within ${result.data?.allowedRadius}m of the store. Current distance: ${Math.round(result.data?.distance || 0)}m`;

        // Add debug info if available
        if (result.data?.debugInfo) {
          console.warn(
            "⚠️ Store coordinate issues:",
            result.data.debugInfo
          );
        }

        if (result.data?.allStoreDistances) {
          console.log(
            "📊 All store distances:",
            result.data.allStoreDistances
          );
        }

        setLocationError(errorMsg);
        return { success: false, matchedStore: null };
      }
      const matchedStoreData = result.data?.matchedStore;
      setMatchedStore(matchedStoreData);
      setLocationVerified(true);
      setLocationError(null);
      return { success: true, matchedStore: matchedStoreData };
    } catch (err) {
      console.error("Location verification error:", err);
      setLocationError("Failed to verify location");
      return { success: false, matchedStore: null };
    } finally {
      setLocationVerifying(false);
    }
  };

  // Handle verify location button click
  const handleVerifyLocation = async (e) => {
    e.preventDefault();

    const hasLocation = customerLocation.latitude && customerLocation.longitude;
    if (!hasLocation) {
      const isGotLocation = await getCustomerLocation();
      if (!isGotLocation) {
        setLocationError("Enable GPS and try again");
        return;
      }
    }

    await verifyLocationWithStore(
      customerLocation.latitude,
      customerLocation.longitude,
    );
  };

  // ===== FORM SUBMISSION (STEP 1 -> STEP 2) =====
  const handleShowCoupons = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    let verifiedStoreData = matchedStore;

    // Get location if not already verified
    if (!locationVerified) {
      const hasLocation =
        customerLocation.latitude && customerLocation.longitude;
      if (!hasLocation) {
        const isGotLocation = await getCustomerLocation();
        if (!isGotLocation) {
          setLocationError("Enable GPS and try again");
          return;
        }
      }

      const verificationResult = await verifyLocationWithStore(
        customerLocation.latitude,
        customerLocation.longitude,
      );
      if (!verificationResult.success) {
        return;
      }
      verifiedStoreData = verificationResult.matchedStore;
    }

    // Submit participation to create scratch
    submitParticipation(verifiedStoreData);
  };

  const submitParticipation = async (verifiedStoreData) => {
    try {
      setSubmitting(true);
      setError(null);
      const storesList = campaign?.assignedStores;
      if (!storesList) {
        setError("Store information not found");
        return;
      }

      const response = await fetch(`/api/customer/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          storesList,
          rangeId: formData.selectedRange,
          customerName: formData.customerName.trim(),
          customerMobile: formData.customerMobile.trim(),
          customerEmail: null,
          billAmount: 0, // Will be provided during redemption
          customerLatitude: customerLocation.latitude,
          customerLongitude: customerLocation.longitude,
          customerConsent: true,
          verifiedStore: verifiedStoreData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to participate");
        return;
      }

      // Store participation and scratch IDs
      const participationId =
        result.data.participationId || result.data.participation._id;
      setParticipationId(participationId);
      setScratchCardId(result.data.scratchCardId);

      // Redirect to coupon selection page (NOT directly to scratch/reward)
      // Flow: Registration → Coupon Selection → Scratch → Reward Reveal
      router.push(
        `/customer/campaign/${campaignId}/coupons/${participationId}`,
      );
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

    // Mock reward assignment
    const rewards = ["₹50", "₹100", "₹150", "₹200", "₹250", "₹300"];
    const selectedReward = rewards[index % rewards.length];

    setAssignedReward({
      type: "Flat",
      value: selectedReward,
    });

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

  // STEP 1: FORM
  if (step === "FORM") {
    return (
      <div className={styles.container}>
        <div className={styles.gridContainer}>
          <section className={styles.formSection}>
            <div className={styles.form}>
              <h1 className={styles.title}>Unlock Your Reward</h1>
              <p className={styles.subtitle}>
                Please enter your details to unlock exclusive offers.
              </p>

              {error && <div className={styles.errorAlert}>{error}</div>}
              {locationError && (
                <div className={styles.warningAlert}>{locationError}</div>
              )}

              <form onSubmit={handleShowCoupons}>
                {/* Name Field */}
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    Your Name <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`${styles.input} ${validationErrors.customerName ? styles.inputError : ""}`}
                    placeholder="Your full name"
                    value={formData.customerName}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        customerName: e.target.value,
                      });
                      if (validationErrors.customerName) {
                        setValidationErrors({
                          ...validationErrors,
                          customerName: null,
                        });
                      }
                    }}
                  />
                  {validationErrors.customerName && (
                    <span className={styles.errorText}>
                      {validationErrors.customerName}
                    </span>
                  )}
                </div>

                {/* Contact Number Field */}
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    Contact Number <span className={styles.required}>*</span>
                  </label>
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
                          setValidationErrors({
                            ...validationErrors,
                            customerMobile: null,
                          });
                        }
                      }}
                    />
                  </div>
                  {validationErrors.customerMobile && (
                    <span className={styles.errorText}>
                      {validationErrors.customerMobile}
                    </span>
                  )}
                </div>

                {/* Range Selection */}
                <div className={styles.rangeSection}>
                  <label className={styles.rangeLabel}>
                    Select your purchase range
                  </label>
                  <div className={styles.rangeGroup}>
                    {ranges.map((range) => (
                      <label
                        key={range._id}
                        className={`${styles.rangeOption} ${formData.selectedRange === range._id ? styles.checked : ""}`}
                      >
                        <input
                          type="radio"
                          name="purchaseRange"
                          value={range._id}
                          checked={formData.selectedRange === range._id}
                          onChange={() => {
                            setFormData({
                              ...formData,
                              selectedRange: range._id,
                            });
                            if (validationErrors.selectedRange) {
                              setValidationErrors({
                                ...validationErrors,
                                selectedRange: null,
                              });
                            }
                          }}
                          className={styles.rangeInput}
                        />
                        <div className={styles.checkbox}></div>
                        <span>
                          ₹{range.minAmount} - ₹{range.maxAmount}
                        </span>
                      </label>
                    ))}
                  </div>
                  {validationErrors.selectedRange && (
                    <span className={styles.errorText}>
                      {validationErrors.selectedRange}
                    </span>
                  )}
                </div>

                {/* Location Status Component */}
                <LocationStatus
                  status={
                    locationVerifying
                      ? "verifying"
                      : locationError
                        ? "error"
                        : locationVerified
                          ? "verified"
                          : "verifying"
                  }
                  latitude={customerLocation.latitude}
                  longitude={customerLocation.longitude}
                  storeName={matchedStore?.storeName}
                  distance={matchedStore?.distance}
                  errorMessage={locationError}
                  onRetry={handleVerifyLocation}
                />

                {/* Two-Button Flow */}
                <div className={styles.buttonGroup}>
                  <button
                    type="button"
                    className={styles.verifyBtn}
                    onClick={handleVerifyLocation}
                    disabled={locationVerifying || locationVerified}
                  >
                    {locationVerifying ? "Verifying..." : "Verify Location"}
                  </button>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={submitting || !locationVerified}
                  >
                    {submitting ? "Processing..." : "Show My Coupons"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // STEP 2: PICK COUPON
  if (step === "PICK") {
    return (
      <div className={styles.container}>
        <div className={styles.gridContainer}>
          <h1 className={styles.title}>Pick your lucky coupon</h1>
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
        <div className={styles.revealContainer}>
          <div
            className={`${styles.revealCard} ${scratched ? styles.scratched : ""}`}
            onClick={handleScratch}
          >
            {!scratched ? (
              <>
                <div
                  className={styles.giftIcon}
                  style={{ width: 80, height: 80 }}
                >
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
                <div className={styles.rewardValue}>
                  {assignedReward?.value}
                </div>
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
