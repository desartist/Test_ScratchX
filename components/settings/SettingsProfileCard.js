"use client";
import React, { useState, useEffect, useRef } from "react";
import { Edit2, Save, X, Camera, Trash2 } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./SettingsProfileCard.module.css";

export default function SettingsProfileCard({ merchant }) {
  const { account, refreshAccount } = useAuthContext();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const KNOWN_BUSINESS_TYPES = [
    "Grocery & Kirana Stores", "Jewellery & Luxury", "Electronics & Gadgets",
    "Fashion & Apparel", "Bakeries & Sweet Shops", "Quick Service (QSR)",
    "Salon & Beauty", "Fitness & Gyms", "Supermarkets / Hypermarkets",
    "Pharmacy / Medical", "Home & Lifestyle", "Other",
  ];
  const [planDisplayName, setPlanDisplayName] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(null);

  const savedBusinessType = merchant?.profile?.businessType || "";
  const isCustomType = savedBusinessType && !KNOWN_BUSINESS_TYPES.includes(savedBusinessType);

  const [formData, setFormData] = useState({
    name: merchant?.name || "",
    phone: merchant?.phone || "",
    businessType: isCustomType ? "Other" : savedBusinessType,
  });
  const [otherBusinessType, setOtherBusinessType] = useState(isCustomType ? savedBusinessType : "");

  // Prefer live AuthContext account (updated by refreshAccount after upload),
  // fall back to the merchant prop for the initial render.
  const profileImage = account?.profileImage || merchant?.profileImage || null;

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/subscription/current", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.subscription) setPlanDisplayName(data.displayName);
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
      } finally {
        setLoadingSubscription(false);
      }
    };
    fetchSubscription();
  }, []);

  useEffect(() => {
    if (merchant && !formData.name && !formData.phone) {
      setFormData({
        name: merchant?.name || "",
        phone: merchant?.phone || "",
        businessType: merchant?.profile?.businessType || "",
      });
    }
  // Only run when merchant first becomes available, not on every object reference change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant?.name, merchant?.phone, merchant?.profile?.businessType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          businessType: formData.businessType === "Other" ? (otherBusinessType.trim() || "Other") : formData.businessType,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
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
    setFormData({
      name: merchant?.name || "",
      phone: merchant?.phone || "",
      businessType: merchant?.profile?.businessType || "",
    });
    setIsEditing(false);
    setError(null);
  };

  // Compress image client-side using Canvas, then upload as base64
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file.");
      return;
    }

    setUploadingImage(true);
    try {
      const dataUrl = await compressImage(file, 300, 0.82);
      const res = await fetch("/api/upload/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageData: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      await refreshAccount();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setUploadingImage(false);
      // Reset so selecting the same file again fires onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingImage(true);
    setImageError(null);
    try {
      const res = await fetch("/api/upload/profile-image", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove photo");
      await refreshAccount();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const getPlanDisplay = () => {
    if (loadingSubscription) return "Loading...";
    return planDisplayName || "No Active Plan";
  };

  return (
    <div className={styles.card}>
      {/* Profile Header */}
      <div className={styles.profileHeader}>
        {/* Avatar with upload overlay */}
        <div className={styles.avatarWrapper}>
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className={styles.avatarImg}
            />
          ) : (
            <div className={styles.avatar}>{getInitials(formData.name)}</div>
          )}

          {/* Camera overlay — always visible on hover */}
          <button
            className={styles.avatarUploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            title="Upload photo"
            aria-label="Upload profile photo"
          >
            {uploadingImage ? (
              <div className={styles.uploadSpinner} />
            ) : (
              <Camera size={16} />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.fileInput}
            onChange={handleFileChange}
          />
        </div>

        <div className={styles.profileInfo}>
          <h3 className={styles.profileName}>{formData.name}</h3>
          <p className={styles.profileEmail}>{merchant?.email}</p>
          <span className={styles.planBadge}>{getPlanDisplay()}</span>

          {/* Remove photo link — only when image exists */}
          {profileImage && (
            <button
              className={styles.removePhotoBtn}
              onClick={handleRemovePhoto}
              disabled={uploadingImage}
            >
              <Trash2 size={12} />
              Remove photo
            </button>
          )}
        </div>
      </div>

      {imageError && (
        <div className={styles.imageErrorBanner}>{imageError}</div>
      )}

      {/* Divider */}
      <div className={styles.divider}></div>

      {/* Status Messages */}
      {success && (
        <div className={styles.successMessage}>✓ Profile updated successfully</div>
      )}
      {error && <div className={styles.errorMessage}>✗ {error}</div>}

      {/* Form */}
      <div className={styles.formSection}>
        <h4 className={styles.sectionTitle}>Profile Information</h4>

        {isEditing ? (
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Full Name"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                type="email"
                value={merchant?.email || ""}
                disabled
                className={styles.input}
                placeholder="Email (Read-only)"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Mobile Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="Mobile Number"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Business Type</label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="">Select Business Type</option>
                <option value="Grocery & Kirana Stores">Grocery &amp; Kirana Stores</option>
                <option value="Jewellery & Luxury">Jewellery &amp; Luxury</option>
                <option value="Electronics & Gadgets">Electronics &amp; Gadgets</option>
                <option value="Fashion & Apparel">Fashion &amp; Apparel</option>
                <option value="Bakeries & Sweet Shops">Bakeries &amp; Sweet Shops</option>
                <option value="Quick Service (QSR)">Quick Service (QSR)</option>
                <option value="Salon & Beauty">Salon &amp; Beauty</option>
                <option value="Fitness & Gyms">Fitness &amp; Gyms</option>
                <option value="Supermarkets / Hypermarkets">Supermarkets / Hypermarkets</option>
                <option value="Pharmacy / Medical">Pharmacy / Medical</option>
                <option value="Home & Lifestyle">Home &amp; Lifestyle</option>
                <option value="Other">Other</option>
              </select>
              {formData.businessType === "Other" && (
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Describe your business type"
                  value={otherBusinessType}
                  onChange={(e) => setOtherBusinessType(e.target.value)}
                  style={{ marginTop: 10 }}
                />
              )}
            </div>

            <div className={styles.buttonGroup}>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={loading}
              >
                <Save size={18} />
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                disabled={loading}
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.viewMode}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Full Name</span>
              <span className={styles.value}>{formData.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Email Address</span>
              <span className={styles.value}>{merchant?.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Mobile Number</span>
              <span className={styles.value}>{formData.phone || "Not provided"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Business Type</span>
              <span className={styles.value}>
                {formData.businessType === "Other"
                  ? (otherBusinessType.trim() || "Other")
                  : (formData.businessType || "Not set")}
              </span>
            </div>

            <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
              <Edit2 size={18} />
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Canvas-based client-side image compression
function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
