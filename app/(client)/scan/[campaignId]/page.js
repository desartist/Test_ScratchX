"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  const [coupons, setCoupons] = useState([]); // All coupons for all ranges
  const [selectedCouponIndex, setSelectedCouponIndex] = useState(null);
  const [assignedReward, setAssignedReward] = useState(null);
  const [scratched, setScratched] = useState(false);
  const [participationId, setParticipationId] = useState(null);
  const [scratchCardId, setScratchCardId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownInfo, setCooldownInfo] = useState(null);
  const [selectedRangeLabel, setSelectedRangeLabel] = useState("");
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(300); // 5 minutes in seconds

  // ===== CLEAR SESSION DATA (defined early so it can be used in useEffect) =====
  const clearSessionData = () => {
    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear form data
    setFormData({ customerName: "", customerMobile: "", selectedRange: "" });
    setAssignedReward(null);
    setParticipationId(null);
    setScratchCardId(null);
    setSelectedCouponIndex(null);
    setLocationVerified(false);

    console.log("[Session] Cleared all session data");
  };

  // Fetch campaign on mount and verify participation status
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

        const campaignData = result.data.campaign;

        // Check if campaign has ended
        if (campaignData?.endDate && new Date(campaignData.endDate) < new Date()) {
          setStep("ENDED");
          setCampaign(campaignData);
          return;
        }

        setCampaign(campaignData);
        setRanges(result.data.ranges || []);

        // ===== FRESH FLOW: Always show FORM on page load =====
        // Participation check (cooldown) only happens at form submission
        // This ensures every QR scan starts fresh from the form, regardless of prior history
        console.log("[Scan] Page loaded - always show FORM for fresh participation flow");
        setStep("FORM");

        // Fetch coupons for this campaign
        const couponsResponse = await fetch(`/api/customer/campaign/${campaignId}/coupons`);
        const couponsResult = await couponsResponse.json();
        console.log("[Coupons] Full API response:", JSON.stringify(couponsResult, null, 2));
        console.log("[Coupons] couponsResult.data:", couponsResult.data);
        console.log("[Coupons] couponsResult.data.coupons:", couponsResult.data?.coupons);

        if (couponsResult.success) {
          // API returns data structure: { campaign: {...}, coupons: [...] }
          let couponsArray = [];

          // Try to extract coupons array
          if (Array.isArray(couponsResult.data?.coupons)) {
            couponsArray = couponsResult.data.coupons;
          } else if (Array.isArray(couponsResult.data)) {
            couponsArray = couponsResult.data;
          }

          console.log("[Coupons] Extracted array:", couponsArray);
          console.log("[Coupons] Array is array?:", Array.isArray(couponsArray));
          console.log("[Coupons] Total coupons:", couponsArray.length);
          if (couponsArray.length > 0) {
            console.log("[Coupons] Sample coupon:", JSON.stringify(couponsArray[0], null, 2));
            console.log("[Coupons] Sample coupon.rangeId:", couponsArray[0].rangeId);
            console.log("[Coupons] All coupons with rangeIds:");
            couponsArray.forEach((c, idx) => {
              console.log(`  [${idx}] id: ${c.id}, rangeId: ${c.rangeId}`);
            });
          }
          setCoupons(couponsArray);
        }
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
  }, [campaignId, step]);

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
        { timeout: 20000, enableHighAccuracy: true, maximumAge: 0 }
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

      // Check if customer can participate (cooldown check)
      const checkResponse = await fetch(`/api/customer/check-participation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          customerMobile: formData.customerMobile.trim(),
        }),
      });

      const checkResult = await checkResponse.json();
      if (!checkResult.canParticipate) {
        setCooldownInfo({
          name: checkResult.participantName,
          date: checkResult.participationDate,
          remainingMinutes: checkResult.remainingMinutes,
          message: checkResult.message,
        });
        setStep("COOLDOWN");
        setSubmitting(false);
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

      // ===== CRITICAL FIX: Store mobile number to verify on return =====
      // This allows us to check participation status if user goes back and returns
      sessionStorage.setItem(`participation_mobile_${campaignId}`, formData.customerMobile.trim());

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

    // Get selected range info
    const selectedRangeObj = ranges.find(r => r._id === formData.selectedRange);
    if (selectedRangeObj) {
      const rangeLabel = `₹${selectedRangeObj.minAmount.toLocaleString("en-IN")} - ₹${selectedRangeObj.maxAmount.toLocaleString("en-IN")}`;
      setSelectedRangeLabel(rangeLabel);
    }

    // Mock reward assignment
    const rewards = ["₹50", "₹100", "₹150", "₹200", "₹250", "₹300"];
    const selectedReward = rewards[index % rewards.length];

    setAssignedReward({
      type: "Flat",
      value: selectedReward,
    });

    setStep("REVEAL");
  };

  // ===== COUNTDOWN TIMER EFFECT =====
  useEffect(() => {
    if (!scratched || step !== "REVEAL") return;

    const interval = setInterval(() => {
      setSessionTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          console.log("[Session] Session expired after 5 minutes");
          clearSessionData();
          setStep("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scratched, step]);

  // ===== SCRATCH REVEAL (STEP 3) =====
  const handleScratch = () => {
    if (scratched) return;

    setScratched(true);
    setSessionTimeRemaining(300); // Reset timer to 5 minutes

    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff0055", "#00ccff", "#ff9900", "#cc00ff"],
    });
  };

  // ===== COOLDOWN STATE =====
  if (step === "COOLDOWN") {
    const participationDate = cooldownInfo?.date ? new Date(cooldownInfo.date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }) : "recently";

    return (
      <div className={styles.container}>
        <div className={styles.revealContainer}>
          <div className={styles.endedLogoWrapper}>
            <Image
              src="/horizontal_logo.svg"
              alt="ScratchX"
              width={140}
              height={50}
              className={styles.endedLogo}
              priority
            />
          </div>
          <div className={styles.cooldownCard}>
            <div className={styles.cooldownIcon}>⏱️</div>
            <h2 className={styles.cooldownTitle}>Try Again Later</h2>
            <p className={styles.cooldownMessage}>
              You scratched a coupon {participationDate}. You can participate again in <strong>{cooldownInfo?.remainingMinutes} minutes</strong>.
            </p>
            <div className={styles.cooldownInfo}>
              <p>Come back soon to win more coupons! Each customer can participate multiple times with a cooldown period between attempts.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== ENDED CAMPAIGN STATE =====
  if (step === "ENDED") {
    const campaignName = campaign?.campaignName || "Campaign";
    const endDate = campaign?.endDate ? new Date(campaign.endDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) : "";

    return (
      <div className={styles.container}>
        <div className={styles.revealContainer}>
          <div className={styles.endedLogoWrapper}>
            <Image
              src="/horizontal_logo.svg"
              alt="ScratchX"
              width={140}
              height={50}
              className={styles.endedLogo}
              priority
            />
          </div>
          <div className={styles.endedCard}>
            <div className={styles.endedIcon}>🎉</div>
            <h2 className={styles.endedTitle}>Campaign Ended</h2>
            <p className={styles.endedSubtitle}>{campaignName}</p>
            <p className={styles.endedMessage}>
              Thank you for participating! This campaign ended on {endDate}.
            </p>
            <div className={styles.endedInfo}>
              <p>We appreciate your interest. Stay tuned for our upcoming campaigns and special offers!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== EXPIRED SESSION STATE =====
  if (step === "EXPIRED") {
    return (
      <div className={styles.container}>
        <div className={styles.revealContainer}>
          <div className={styles.expiredLogoWrapper}>
            <Image
              src="/horizontal_logo.svg"
              alt="ScratchX"
              width={140}
              height={50}
              className={styles.endedLogo}
              priority
            />
          </div>
          <div className={styles.expiredCard}>
            <div className={styles.expiredIcon}>⏳</div>
            <h2 className={styles.expiredTitle}>Coupon Expired</h2>
            <p className={styles.expiredMessage}>
              Your session has expired. Please present this screen to the cashier within 5 minutes of revealing your reward.
            </p>
            <div className={styles.expiredInfo}>
              <p>For assistance, ask the cashier at the store counter.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                          console.log("[Range Select] Selected range ID:", range._id, "Range object:", range);
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
    console.clear();
    console.log("========== PICK STEP STARTED ==========");
    // Filter coupons by selected range
    const selectedRangeObj = ranges.find(r => r._id === formData.selectedRange);
    console.error("[PICK] Selected range:", formData.selectedRange);
    console.error("[PICK] Selected range object:", selectedRangeObj);
    console.error("[PICK] Total coupons available:", coupons.length);
    console.error("[PICK] Coupons array:", coupons);

    // Show rangeIds of all coupons
    console.error("[PICK] === FILTERING DETAILS ===");
    const rangeIdMap = {};
    coupons.forEach(c => {
      const rid = c.rangeId || c.range_id || c.billingRangeId || c.billing_range_id || 'NO_RANGE_ID';
      if (!rangeIdMap[rid]) rangeIdMap[rid] = [];
      rangeIdMap[rid].push(c.id);
    });
    Object.entries(rangeIdMap).forEach(([rid, ids]) => {
      console.error(`  RangeId "${rid}": ${ids.length} coupons`);
    });

    // Filter coupons by selected range - handle multiple field name possibilities
    const rangeBasedCoupons = coupons.filter(coupon => {
      // Try different field names that might contain the range ID
      const couponRangeId = coupon.rangeId || coupon.range_id || coupon.billingRangeId || coupon.billing_range_id;
      const selectedRangeId = formData.selectedRange;

      const matches = String(couponRangeId) === String(selectedRangeId);
      console.error(`  Coupon ${coupon.id}: "${couponRangeId}" vs "${selectedRangeId}" => ${matches ? "✅ MATCH" : "❌ NO MATCH"}`);

      return matches;
    });

    console.log(`[PICK] Filtering complete: ${coupons.length} total => ${rangeBasedCoupons.length} filtered for range ${formData.selectedRange}`);

    // Display message if no coupons available for this range
    const availableCoupons = rangeBasedCoupons.length > 0 ? rangeBasedCoupons : [1, 2, 3, 4, 5, 6];
    const noCouponsMessage = rangeBasedCoupons.length === 0;

    return (
      <div className={styles.container}>
        <div className={styles.gridContainer}>
          <h1 className={styles.title}>Pick your lucky coupon</h1>
          <p className={styles.subtitle}>
            {selectedRangeObj ? `₹${selectedRangeObj.minAmount.toLocaleString("en-IN")} - ₹${selectedRangeObj.maxAmount.toLocaleString("en-IN")}` : ''} range - You can scratch only one
          </p>

          {noCouponsMessage && (
            <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
              <p>No coupons available for this range. Please select a different range.</p>
              <button
                onClick={() => setStep("FORM")}
                style={{
                  padding: "10px 20px",
                  background: "#ff9800",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  marginTop: "10px"
                }}
              >
                Back to Select Range
              </button>
            </div>
          )}

          {!noCouponsMessage && (
            <div className={styles.grid}>
              {availableCoupons.map((item, idx) => (
                <div
                  key={idx}
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
          )}
        </div>
      </div>
    );
  }

  // STEP 3: REVEAL
  if (step === "REVEAL") {
    const minutes = Math.floor(sessionTimeRemaining / 60);
    const seconds = sessionTimeRemaining % 60;
    const timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return (
      <div className={styles.container}>
        <div className={styles.revealContainer}>
          {/* Timer Display */}
          {scratched && (
            <div className={styles.timerSection}>
              <div className={styles.timerLabel}>SESSION EXPIRES IN</div>
              <div className={styles.timerDisplay}>{timerDisplay}</div>
            </div>
          )}

          {/* Range Info */}
          {selectedRangeLabel && (
            <div className={styles.rangeInfo}>
              <span className={styles.rangeLabel}>Billing Range: {selectedRangeLabel}</span>
            </div>
          )}

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
