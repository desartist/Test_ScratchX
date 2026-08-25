"use client";
import React, { useState, useRef } from "react";
import { Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import styles from "./SettingsPaymentDetailsCard.module.css";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_PATTERN = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;

// Distributor-only card — lets a distributor share how the retailers/
// wholesalers they manage can pay them directly: bank transfer, UPI, or by
// scanning an uploaded QR code. The QR code is required; the rest are
// optional and independent.
export default function SettingsPaymentDetailsCard({ paymentDetails: initialPaymentDetails }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // The last-saved state, shown in view mode — kept in local state (rather
  // than reading the prop directly) so a successful save reflects instantly
  // without depending on the parent refetching the account.
  const [paymentDetails, setPaymentDetails] = useState(initialPaymentDetails || null);

  const hasSavedDetails =
    paymentDetails?.accountNumber ||
    paymentDetails?.upiId ||
    paymentDetails?.qrCodeImage;

  const [form, setForm] = useState({
    accountHolderName: paymentDetails?.accountHolderName || "",
    accountNumber: paymentDetails?.accountNumber || "",
    ifscCode: paymentDetails?.ifscCode || "",
    upiId: paymentDetails?.upiId || "",
  });
  const [qrCodeImage, setQrCodeImage] = useState(paymentDetails?.qrCodeImage || null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!qrCodeImage) {
      setError("QR code image is required");
      return false;
    }
    if ((form.accountNumber.trim() && !form.ifscCode.trim()) || (form.ifscCode.trim() && !form.accountNumber.trim())) {
      setError("Account Number and IFSC Code must be provided together");
      return false;
    }
    if (form.accountNumber.trim() && !/^\d{6,20}$/.test(form.accountNumber.trim())) {
      setError("Account Number must be 6-20 digits");
      return false;
    }
    if (form.ifscCode.trim() && !IFSC_PATTERN.test(form.ifscCode.trim().toUpperCase())) {
      setError("Invalid IFSC code format");
      return false;
    }
    if (form.upiId.trim() && !UPI_PATTERN.test(form.upiId.trim())) {
      setError("Invalid UPI ID format");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/settings/payment-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountHolderName: form.accountHolderName.trim() || null,
          accountNumber: form.accountNumber.trim() || null,
          ifscCode: form.ifscCode.trim() || null,
          upiId: form.upiId.trim() || null,
          qrCodeImage,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save payment details");

      setSuccess(true);
      setIsEditing(false);
      setPaymentDetails(json.paymentDetails);
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
    setForm({
      accountHolderName: paymentDetails?.accountHolderName || "",
      accountNumber: paymentDetails?.accountNumber || "",
      ifscCode: paymentDetails?.ifscCode || "",
      upiId: paymentDetails?.upiId || "",
    });
    setQrCodeImage(paymentDetails?.qrCodeImage || null);
  };

  const handleQrFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the QR code");
      return;
    }

    setUploadingQr(true);
    try {
      const dataUrl = await compressImage(file, 500, 0.85);
      setQrCodeImage(dataUrl);
    } catch {
      setError("Failed to read QR code image");
    } finally {
      setUploadingQr(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.card}>
      <h3>Payment Details</h3>

      {success && (
        <div className={styles.successMessage}>
          <CheckCircle2 size={16} />
          Payment details updated
        </div>
      )}
      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!isEditing && hasSavedDetails && (
        <div className={styles.viewMode}>
          {paymentDetails?.accountHolderName && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Account Holder</span>
              <span className={styles.value}>{paymentDetails.accountHolderName}</span>
            </div>
          )}
          {paymentDetails?.accountNumber && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Account Number</span>
              <span className={styles.value}>{paymentDetails.accountNumber}</span>
            </div>
          )}
          {paymentDetails?.ifscCode && (
            <div className={styles.infoItem}>
              <span className={styles.label}>IFSC Code</span>
              <span className={styles.value}>{paymentDetails.ifscCode}</span>
            </div>
          )}
          {paymentDetails?.upiId && (
            <div className={styles.infoItem}>
              <span className={styles.label}>UPI ID</span>
              <span className={styles.value}>{paymentDetails.upiId}</span>
            </div>
          )}
          {paymentDetails?.qrCodeImage && (
            <div className={styles.qrPreviewRow}>
              <span className={styles.label}>QR Code</span>
              <img src={paymentDetails.qrCodeImage} alt="Payment QR code" className={styles.qrPreview} />
            </div>
          )}
          <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
            Edit Payment Details
          </button>
        </div>
      )}

      {isEditing && (
        <div className={styles.editMode}>
          <p className={styles.hint}>
            The QR code is required; the rest are optional — fill in any that apply. These will be shown to the retailers and wholesalers you manage so they can pay you directly.
          </p>

          <label>Account Holder Name</label>
          <input
            placeholder="Name on the bank account"
            name="accountHolderName"
            value={form.accountHolderName}
            onChange={handleChange}
            className={styles.input}
          />

          <div className={styles.row}>
            <div>
              <label>Account Number</label>
              <input
                placeholder="Bank account number"
                name="accountNumber"
                inputMode="numeric"
                value={form.accountNumber}
                onChange={(e) => handleChange({ target: { name: "accountNumber", value: e.target.value.replace(/\D/g, "").slice(0, 20) } })}
                className={styles.input}
              />
            </div>
            <div>
              <label>IFSC Code</label>
              <input
                placeholder="E.g. HDFC0001234"
                name="ifscCode"
                value={form.ifscCode}
                onChange={(e) => handleChange({ target: { name: "ifscCode", value: e.target.value.toUpperCase().slice(0, 11) } })}
                className={styles.input}
              />
            </div>
          </div>

          <label>UPI ID</label>
          <input
            placeholder="E.g. yourname@upi"
            name="upiId"
            value={form.upiId}
            onChange={handleChange}
            className={styles.input}
          />

          <label>QR Code <span className={styles.required}>*</span></label>
          {qrCodeImage ? (
            <div className={styles.qrEditPreview}>
              <img src={qrCodeImage} alt="Payment QR code" className={styles.qrPreview} />
              <button
                type="button"
                className={styles.removeQrBtn}
                onClick={() => setQrCodeImage(null)}
                disabled={uploadingQr}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.uploadQrBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingQr}
            >
              {uploadingQr ? "Uploading..." : "Upload QR Code Image"}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.fileInput}
            onChange={handleQrFileChange}
          />

          <div className={styles.buttonGroup}>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={loading || uploadingQr}
            >
              {loading ? "Saving..." : "Save Payment Details"}
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

      {!isEditing && !hasSavedDetails && (
        <div className={styles.emptyState}>
          <p>No payment details added yet</p>
          <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
            Add Payment Details
          </button>
        </div>
      )}
    </div>
  );
}

// Canvas-based client-side image compression, mirrors SettingsProfileCard's
// profile-photo pattern so QR uploads stay well under the 500 KB API limit.
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
