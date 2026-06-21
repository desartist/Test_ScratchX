"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
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

  // ===== SILENT LOCATION CAPTURE =====
  const getCustomerLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, code: "unsupported" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCustomerLocation({ latitude, longitude });
          resolve({ success: true, latitude, longitude });
        },
        (err) => {
          const code = err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable";
          resolve({ success: false, code });
        },
        { timeout: 12000, enableHighAccuracy: false }
      );
    });
  };

  // ===== SINGLE CTA: SHOW MY COUPONS =====
  // Validates → captures GPS silently → verifies with store → submits
  const handleShowCoupons = async (e) => {
    e.preventDefault();
    setLocationError(null);
    setError(null);

    if (!validateForm()) return;

    setLocationVerifying(true);

    // Step 1: get GPS (use cached if available)
    let lat = customerLocation.latitude;
    let lng = customerLocation.longitude;

    if (!lat || !lng) {
      const loc = await getCustomerLocation();
      if (!loc.success) {
        const msgs = {
          denied:      { emoji: "🔒", title: "Location permission needed", body: "We need your location to make sure you're at the store.", tip: "Tap 'Allow' when your browser asks, or enable it in your phone settings." },
          timeout:     { emoji: "⏱️", title: "GPS is taking a moment", body: "We couldn't get your location in time — this sometimes happens indoors.", tip: "Try stepping outside briefly, then tap Show My Coupons again." },
          unsupported: { emoji: "📵", title: "Location not available", body: "Your browser doesn't support location services.", tip: "Try opening this page in Chrome or Safari." },
          unavailable: { emoji: "📡", title: "Can't detect your location", body: "Your GPS seems to be off or unavailable right now.", tip: "Enable location / GPS on your device and try again." },
        };
        setLocationError(msgs[loc.code] || msgs.unavailable);
        setLocationVerifying(false);
        return;
      }
      lat = loc.latitude;
      lng = loc.longitude;
    }

    // Step 2: verify with store
    const storesList = campaign?.assignedStores;
    if (!storesList?.length) {
      setLocationError({ title: "Store not found", body: "No stores are assigned to this campaign. Contact the merchant." });
      setLocationVerifying(false);
      return;
    }

    try {
      const response = await fetch(`/api/customer/location-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, storesList, customerLatitude: lat, customerLongitude: lng }),
      });
      const result = await response.json();

      if (!result.success || !result.data?.isValid) {
        const dist = Math.round(result.data?.distance || 0);
        const radius = result.data?.allowedRadius || 500;
        setLocationError({
          emoji: "📍",
          title: "Almost there!",
          body: `It looks like you're about ${dist}m away from the store. Head a little closer — you need to be within ${radius}m to unlock your reward.`,
          tip: "Make sure you're inside the store and your GPS is turned on.",
        });
        setLocationVerifying(false);
        return;
      }

      const verifiedStoreData = result.data?.matchedStore;
      setMatchedStore(verifiedStoreData);
      setLocationVerified(true);
      setLocationVerifying(false);

      // Step 3: submit participation
      submitParticipation(verifiedStoreData, lat, lng);
    } catch {
      setLocationError({ emoji: "🌐", title: "Connection issue", body: "We couldn't reach our servers to verify your location.", tip: "Check your internet connection and try again." });
      setLocationVerifying(false);
    }
  };

  const submitParticipation = async (verifiedStoreData, lat, lng) => {
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
          billAmount: 0,
          customerLatitude: lat ?? customerLocation.latitude,
          customerLongitude: lng ?? customerLocation.longitude,
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
    // Build store avatar initials — storeName lives in assignedStores[0]
    const storeName = campaign?.assignedStores?.[0]?.storeName || "";
    const campaignName = campaign?.campaignName || "";
    const initials = storeName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("");

    return (
      <div className={styles.container}>
        <div className={styles.pageWrapper}>
          {/* Store info header — shown after page load from campaign data */}
          {storeName && (
            <div className={styles.storeHeader}>
              <div className={styles.storeAvatar}>{initials || "S"}</div>
              <div className={styles.storeInfo}>
                <p className={styles.storeName}>{storeName}</p>
                {campaignName && <p className={styles.campaignName}>{campaignName}</p>}
              </div>
            </div>
          )}

          <div className={styles.formCard}>
            <h1 className={styles.title}>Unlock Your Reward</h1>
            <p className={styles.subtitle}>
              Please enter your details to scratch &amp; win exclusive offers
            </p>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleShowCoupons}>
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
                    if (validationErrors.customerName)
                      setValidationErrors({ ...validationErrors, customerName: null });
                  }}
                />
                {validationErrors.customerName && (
                  <span className={styles.errorText}>{validationErrors.customerName}</span>
                )}
              </div>

              {/* Contact Number Field */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Contact Number</label>
                <div className={`${styles.mobileInputWrapper} ${validationErrors.customerMobile ? styles.inputError : ""}`}>
                  <span className={styles.phonePrefix}>+91</span>
                  <div className={styles.prefixDivider} />
                  <input
                    type="tel"
                    className={styles.mobileInput}
                    placeholder="9099321133"
                    maxLength="10"
                    value={formData.customerMobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, customerMobile: value });
                      if (validationErrors.customerMobile)
                        setValidationErrors({ ...validationErrors, customerMobile: null });
                    }}
                  />
                </div>
                {validationErrors.customerMobile && (
                  <span className={styles.errorText}>{validationErrors.customerMobile}</span>
                )}
              </div>

              {/* Range Selection */}
              <div className={styles.rangeSection}>
                <label className={styles.label}>Select your purchase range</label>
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
                          setFormData({ ...formData, selectedRange: range._id });
                          if (validationErrors.selectedRange)
                            setValidationErrors({ ...validationErrors, selectedRange: null });
                        }}
                        className={styles.rangeRadio}
                      />
                      <span className={styles.radioCircle} />
                      <span className={styles.rangeText}>
                        ₹{range.minAmount.toLocaleString("en-IN")} - ₹{range.maxAmount.toLocaleString("en-IN")}
                      </span>
                    </label>
                  ))}
                </div>
                {validationErrors.selectedRange && (
                  <span className={styles.errorText}>{validationErrors.selectedRange}</span>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting || locationVerifying}
              >
                {locationVerifying
                  ? <><span className={styles.btnSpinner} /> Verifying location…</>
                  : submitting
                  ? <><span className={styles.btnSpinner} /> Processing…</>
                  : "Show My Coupons"}
              </button>
            </form>
          </div>
        </div>

        {/* Location error bottom-sheet modal */}
        {locationError && (
          <div className={styles.locModalBackdrop} onClick={() => setLocationError(null)}>
            <div className={styles.locModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.locModalHandle} />
              <div className={styles.locModalEmoji}>{locationError.emoji}</div>
              <h3 className={styles.locModalTitle}>{locationError.title}</h3>
              <p className={styles.locModalBody}>{locationError.body}</p>
              {locationError.tip && (
                <div className={styles.locModalTip}>
                  <span className={styles.locModalTipIcon}>💡</span>
                  {locationError.tip}
                </div>
              )}
              <button
                className={styles.locModalBtn}
                onClick={() => setLocationError(null)}
              >
                Got it, I'll try again
              </button>
            </div>
          </div>
        )}
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
