"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./participationForm.module.css";

export default function ParticipationPage() {
  const { campaignId } = useParams();
  const router = useRouter();

  // Campaign and ranges state
  const [campaignData, setCampaignData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    customerMobile: "",
    customerEmail: "",
    billAmount: "",
    selectedRange: "",
    customerConsent: false,
  });

  // Location and submission state
  const [locationVerifying, setLocationVerifying] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationVerified, setLocationVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Customer location
  const [customerLocation, setCustomerLocation] = useState({
    latitude: null,
    longitude: null,
  });

  // Fetch campaign and ranges on mount
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customer/campaign/${campaignId}`);
        const result = await response.json();

        if (!result.success) {
          setError(result.error || "Failed to load campaign");
          return;
        }

        setCampaignData(result.data);
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

  // Validate form fields
  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.customerName.trim()) {
      errors.customerName = "Name is required";
    }

    // Mobile validation
    if (!formData.customerMobile.trim()) {
      errors.customerMobile = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(formData.customerMobile)) {
      errors.customerMobile = "Mobile must be exactly 10 digits";
    }

    // Bill amount validation
    if (!formData.billAmount) {
      errors.billAmount = "Bill amount is required";
    } else if (isNaN(formData.billAmount) || formData.billAmount < 0) {
      errors.billAmount = "Bill amount must be a valid number";
    }

    // Range validation
    if (!formData.selectedRange) {
      errors.selectedRange = "Please select a billing range";
    }

    // Check if bill amount falls within selected range
    if (formData.selectedRange && campaignData?.ranges) {
      const selectedRange = campaignData.ranges.find(
        (r) => r._id === formData.selectedRange
      );
      if (selectedRange) {
        const billAmount = parseFloat(formData.billAmount);
        if (billAmount < selectedRange.minAmount || billAmount > selectedRange.maxAmount) {
          errors.billAmount = `Bill amount must be between ₹${selectedRange.minAmount} and ₹${selectedRange.maxAmount}`;
        }
      }
    }

    // Consent validation
    if (!formData.customerConsent) {
      errors.customerConsent = "You must agree to terms and conditions";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Get customer location
  // CRITICAL FIX: Returns coordinates directly, doesn't rely on state update timing
  const getCustomerLocation = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser");
        resolve({ success: false, latitude: null, longitude: null });
        return;
      }

      setLocationVerifying(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          // Update state for UI display
          setCustomerLocation({
            latitude,
            longitude,
          });

          // CRITICAL: Return coordinates directly (not dependent on state update timing)
          // This prevents race condition where function resolves before state updates
          console.log("📍 Location captured:", { latitude, longitude });
          resolve({
            success: true,
            latitude,
            longitude
          });
        },
        (error) => {
          console.error("📍 Geolocation error:", error);
          setLocationError(
            "Unable to get your location. Please enable location services and try again."
          );
          resolve({ success: false, latitude: null, longitude: null });
        },
        { timeout: 10000 }
      );
    });
  };

  // Verify location with store
  const verifyLocationWithStore = async (latitude, longitude) => {
    try {
      // CRITICAL GUARD: Never call API with null coordinates
      if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        console.error("❌ Attempt to verify location with null coordinates:", { latitude, longitude });
        setLocationError("Location coordinates are invalid. Please try again.");
        setLocationVerifying(false);
        return false;
      }

      setLocationVerifying(true);
      setLocationError(null);

      // Get the store list from campaign
      const storesList = campaignData?.assignedStores || [];

      if (!storesList || storesList.length === 0) {
        setLocationError("No stores assigned to this campaign");
        setLocationVerifying(false);
        return false;
      }

      console.log("🔍 Verifying location with coordinates:", { latitude, longitude, storeCount: storesList.length });

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

      if (!result.success) {
        setLocationError(
          result.error || "Location verification failed. Please try again."
        );
        return false;
      }

      // Check if location is verified
      if (!result.data.verified) {
        // Build error message with fallback for missing allowedRadius
        const allowedRadius = result.data.allowedRadius || 2000;
        const distance = result.data.distance || 0;
        const errorMessage = distance === 0 && !result.data.allowedRadius
          ? result.data.message || "Store location data is not available. Please contact the merchant."
          : `You must be within ${allowedRadius}m of the store. Current distance: ${Math.round(distance)}m`;

        console.error("❌ Location verification failed:", {
          verified: result.data.verified,
          distance,
          allowedRadius,
          message: result.data.message,
          storeLocation: result.data.storeLocation
        });

        setLocationError(errorMessage);
        return false;
      }

      setLocationVerified(true);
      setLocationError(null);
      return true;
    } catch (err) {
      console.error("Error verifying location:", err);
      setLocationError("Failed to verify location. Please try again.");
      return false;
    } finally {
      setLocationVerifying(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first
    if (!validateForm()) {
      return;
    }

    // Get location if not already verified
    if (!locationVerified) {
      const locationResult = await getCustomerLocation();

      // CRITICAL: Check the returned coordinates, not state (which updates asynchronously)
      if (!locationResult.success || !locationResult.latitude || !locationResult.longitude) {
        setLocationError("Unable to get your location. Please enable GPS and try again.");
        return;
      }

      console.log("✅ Location acquired, verifying with store...", locationResult);

      // Verify location with store using returned coordinates
      const isVerified = await verifyLocationWithStore(
        locationResult.latitude,
        locationResult.longitude
      );
      if (!isVerified) {
        return;
      }
    }

    // Submit participation
    submitParticipation();
  };

  const submitParticipation = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // CRITICAL GUARD: Verify we have valid location coordinates
      if (
        customerLocation.latitude === null ||
        customerLocation.latitude === undefined ||
        customerLocation.longitude === null ||
        customerLocation.longitude === undefined
      ) {
        console.error("❌ Submit attempted with null coordinates:", customerLocation);
        setError("Location information is required. Please enable GPS and try again.");
        setSubmitting(false);
        return;
      }

      // Validate coordinates are numbers
      if (typeof customerLocation.latitude !== 'number' || typeof customerLocation.longitude !== 'number') {
        console.error("❌ Location coordinates are not numbers:", typeof customerLocation.latitude, typeof customerLocation.longitude);
        setError("Location data is invalid. Please try again.");
        setSubmitting(false);
        return;
      }

      console.log("📤 Submitting participation with location:", {
        campaignId,
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
        range: formData.selectedRange,
        customerName: formData.customerName
      });

      const response = await fetch(`/api/customer/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          // storeId is optional - API will determine from location verification
          rangeId: formData.selectedRange,
          customerName: formData.customerName.trim(),
          customerMobile: formData.customerMobile.trim(),
          customerEmail: formData.customerEmail.trim() || null,
          billAmount: parseFloat(formData.billAmount),
          customerLatitude: customerLocation.latitude,
          customerLongitude: customerLocation.longitude,
          customerConsent: formData.customerConsent,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to submit participation. Please try again.");
        return;
      }

      // Navigate to coupon selection grid page
      const participationId = result.data.participation._id;
      router.push(
        `/customer/campaign/${campaignId}/scratch?participationId=${participationId}`
      );
    } catch (err) {
      console.error("Error submitting participation:", err);
      setError("Failed to submit participation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Handle range selection change
  const handleRangeChange = (e) => {
    const rangeId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      selectedRange: rangeId,
    }));

    // Clear validation error
    if (validationErrors.selectedRange) {
      setValidationErrors((prev) => ({
        ...prev,
        selectedRange: null,
      }));
    }
  };

  // Handle bill amount change to auto-select range
  const handleBillAmountChange = (e) => {
    const amount = e.target.value;
    setFormData((prev) => ({
      ...prev,
      billAmount: amount,
    }));

    // Auto-select range if amount falls within a range
    if (amount && campaignData?.ranges) {
      const billAmount = parseFloat(amount);
      const matchingRange = campaignData.ranges.find(
        (r) => billAmount >= r.minAmount && billAmount <= r.maxAmount
      );
      if (matchingRange) {
        setFormData((prev) => ({
          ...prev,
          selectedRange: matchingRange._id,
        }));
      }
    }

    // Clear validation error
    if (validationErrors.billAmount) {
      setValidationErrors((prev) => ({
        ...prev,
        billAmount: null,
      }));
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}>Loading campaign details...</div>
      </div>
    );
  }

  if (error && !campaignData) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          title="Go back"
        >
          ← Back
        </button>
        <h1 className={styles.headerTitle}>Participate</h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          {error && <div className={styles.errorAlert}>{error}</div>}
          {locationError && (
            <div className={styles.warningAlert}>{locationError}</div>
          )}

          {/* Campaign Info */}
          {campaignData?.campaign && (
            <div className={styles.campaignInfo}>
              <h2 className={styles.campaignTitle}>
                {campaignData.campaign.campaignName}
              </h2>
              <p className={styles.campaignDescription}>
                {campaignData.campaign.description}
              </p>
            </div>
          )}

          {/* Customer Name */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="customerName">
              Your Name <span className={styles.required}>*</span>
            </label>
            <input
              id="customerName"
              type="text"
              name="customerName"
              className={`${styles.input} ${validationErrors.customerName ? styles.inputError : ""
                }`}
              placeholder="Enter your full name"
              value={formData.customerName}
              onChange={handleInputChange}
            />
            {validationErrors.customerName && (
              <span className={styles.errorText}>
                {validationErrors.customerName}
              </span>
            )}
          </div>

          {/* Mobile Number */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="customerMobile">
              Mobile Number <span className={styles.required}>*</span>
            </label>
            <div className={styles.mobileInputWrapper}>
              <span className={styles.mobilePrefix}>+91</span>
              <input
                id="customerMobile"
                type="tel"
                name="customerMobile"
                className={`${styles.input} ${styles.mobileInput} ${validationErrors.customerMobile ? styles.inputError : ""
                  }`}
                placeholder="9099321133"
                maxLength="10"
                value={formData.customerMobile}
                onChange={handleInputChange}
              />
            </div>
            {validationErrors.customerMobile && (
              <span className={styles.errorText}>
                {validationErrors.customerMobile}
              </span>
            )}
          </div>

          {/* Email (Optional) */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="customerEmail">
              Email <span className={styles.optional}>(Optional)</span>
            </label>
            <input
              id="customerEmail"
              type="email"
              name="customerEmail"
              className={styles.input}
              placeholder="your@email.com"
              value={formData.customerEmail}
              onChange={handleInputChange}
            />
          </div>

          {/* Bill Amount */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="billAmount">
              Bill Amount <span className={styles.required}>*</span>
            </label>
            <div className={styles.amountInputWrapper}>
              <span className={styles.currencyPrefix}>₹</span>
              <input
                id="billAmount"
                type="number"
                name="billAmount"
                className={`${styles.input} ${styles.amountInput} ${validationErrors.billAmount ? styles.inputError : ""
                  }`}
                placeholder="0"
                min="0"
                step="1"
                value={formData.billAmount}
                onChange={handleBillAmountChange}
              />
            </div>
            {validationErrors.billAmount && (
              <span className={styles.errorText}>
                {validationErrors.billAmount}
              </span>
            )}
          </div>

          {/* Range Selection */}
          {campaignData?.ranges && campaignData.ranges.length > 0 && (
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="selectedRange">
                Purchase Range <span className={styles.required}>*</span>
              </label>
              <select
                id="selectedRange"
                name="selectedRange"
                className={`${styles.input} ${styles.select} ${validationErrors.selectedRange ? styles.inputError : ""
                  }`}
                value={formData.selectedRange}
                onChange={handleRangeChange}
              >
                <option value="">Select a range</option>
                {campaignData.ranges.map((range) => (
                  <option key={range._id} value={range._id}>
                    ₹{range.minAmount} - ₹{range.maxAmount}
                  </option>
                ))}
              </select>
              {validationErrors.selectedRange && (
                <span className={styles.errorText}>
                  {validationErrors.selectedRange}
                </span>
              )}
            </div>
          )}

          {/* Consent Checkbox */}
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="customerConsent"
                className={styles.checkbox}
                checked={formData.customerConsent}
                onChange={handleInputChange}
              />
              <span>
                I agree to the terms and conditions and consent to data usage
                <span className={styles.required}>*</span>
              </span>
            </label>
            {validationErrors.customerConsent && (
              <span className={styles.errorText}>
                {validationErrors.customerConsent}
              </span>
            )}
          </div>

          {/* Location Detection Status */}
          {locationVerifying && !locationVerified && (
            <div className={styles.infoAlert}>
              📍 Detecting your location... Please allow location access if prompted.
            </div>
          )}

          {/* Location Verified Status */}
          {locationVerified && (
            <div className={styles.successAlert}>
              ✅ Location verified! You're at the correct location.
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={submitting || locationVerifying}
        >
          {submitting ? "Submitting..." : locationVerifying ? "Verifying Location..." : "Continue to Scratch"}
        </button>
      </form>
    </div>
  );
}

