"use client";
import React, { useState, useEffect } from "react";
import styles from "./SettingsBusinessCard.module.css";

export default function SettingsBusinessCard({ merchant }) {
  console.log("Merchant data in Business Card:", merchant);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize state with merchant data if available
  const getInitialBusiness = () => {
    if (merchant?.businessInfo) {
      return {
        businessName: merchant.businessInfo.businessName || "",
        gstNumber: merchant.businessInfo.gstNumber || "",
        address: merchant.businessInfo.address || "",
        city: merchant.businessInfo.city || "",
        state: merchant.businessInfo.state || "",
        pincode: merchant.businessInfo.pincode || "",
      };
    }
    return {
      businessName: "",
      gstNumber: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    };
  };

  const [business, setBusiness] = useState(getInitialBusiness());

  useEffect(() => {
    if (merchant?.businessInfo) {
      const info = merchant.businessInfo;
      setBusiness({
        businessName: info.businessName ? String(info.businessName).trim() : "",
        gstNumber: info.gstNumber ? String(info.gstNumber).trim() : "",
        address: info.address ? String(info.address).trim() : "",
        city: info.city ? String(info.city).trim() : "",
        state: info.state ? String(info.state).trim() : "",
        pincode: info.pincode ? String(info.pincode).trim() : "",
      });
    }
  }, [
    merchant?.businessInfo?.businessName,
    merchant?.businessInfo?.address,
    merchant?.businessInfo?.city,
    merchant?.businessInfo?.state,
  ]);

  const hasBusinessInfo =
    business.businessName ||
    business.address ||
    business.city ||
    business.state;

  const handleChange = (e) => {
    setBusiness({ ...business, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!business.businessName?.trim()) {
      setError("Business name is required");
      return false;
    }
    if (!business.address?.trim()) {
      setError("Address is required");
      return false;
    }
    if (!business.city?.trim()) {
      setError("City is required");
      return false;
    }
    if (!business.state?.trim()) {
      setError("State is required");
      return false;
    }
    if (!business.pincode?.trim()) {
      setError("Pincode is required");
      return false;
    }
    if (
      business.gstNumber &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9]{1}$/.test(
        business.gstNumber,
      )
    ) {
      setError("Invalid GST format");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/settings/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(business),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save business details");
      }

      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setBusiness({
      businessName: merchant?.businessInfo?.businessName || "",
      gstNumber: merchant?.businessInfo?.gstNumber || "",
      address: merchant?.businessInfo?.address || "",
      city: merchant?.businessInfo?.city || "",
      state: merchant?.businessInfo?.state || "",
      pincode: merchant?.businessInfo?.pincode || "",
    });
  };

  return (
    <div className={styles.card}>
      <h3>Business Information</h3>

      {success && (
        <div className={styles.successMessage}>✓ Business details updated</div>
      )}
      {error && <div className={styles.errorMessage}>✗ {error}</div>}

      {/* View Mode - Display existing business info */}
      {!isEditing && hasBusinessInfo && (
        <div className={styles.viewMode}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Business Name</span>
            <span className={styles.value}>{business.businessName}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>GST Number</span>
            <span className={styles.value}>
              {business.gstNumber || "Not provided"}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Address</span>
            <span className={styles.value}>{business.address}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>City</span>
            <span className={styles.value}>{business.city}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>State</span>
            <span className={styles.value}>{business.state}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Pincode</span>
            <span className={styles.value}>{business.pincode}</span>
          </div>
          <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
            Edit Business Info
          </button>
        </div>
      )}

      {/* Edit Mode - Form to edit business info */}
      {isEditing && (
        <div className={styles.editMode}>
          <label>Business Name *</label>
          <input
            placeholder="Business Name"
            name="businessName"
            value={business.businessName}
            onChange={handleChange}
            className={styles.input}
          />

          <label>GST Number (Optional)</label>
          <input
            placeholder="GST Number"
            name="gstNumber"
            value={business.gstNumber}
            onChange={handleChange}
            className={styles.input}
          />

          <label>Address *</label>
          <input
            placeholder="Address"
            name="address"
            value={business.address}
            onChange={handleChange}
            className={styles.input}
          />

          <div className={styles.row}>
            <div>
              <label>City *</label>
              <input
                placeholder="City"
                name="city"
                value={business.city}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
            <div>
              <label>State *</label>
              <input
                placeholder="State"
                name="state"
                value={business.state}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
            <div>
              <label>Pincode *</label>
              <input
                placeholder="Pincode"
                name="pincode"
                value={business.pincode}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Business Details"}
            </button>
            <button
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No Business Info State */}
      {!isEditing && !hasBusinessInfo && (
        <div className={styles.emptyState}>
          <p>No business information added yet</p>
          <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
            Add Business Information
          </button>
        </div>
      )}
    </div>
  );
}
