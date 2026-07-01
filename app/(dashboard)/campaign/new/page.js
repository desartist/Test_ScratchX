"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import Link from "next/link";
import { Calendar, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

// Today's date in YYYY-MM-DD format for the min attribute
const todayStr = new Date().toISOString().split("T")[0];

// Inline field error component
function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className={styles.fieldError}>
      <AlertCircle size={13} />
      {message}
    </p>
  );
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { account } = useAuthContext();

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Refs for scroll-to-error
  const refs = {
    campaignName: useRef(null),
    startDate: useRef(null),
    endDate: useRef(null),
  };

  const [formData, setFormData] = useState({
    campaignName: "",
    description: "",
    startDate: "",
    endDate: "",
    displayCoupons: "6",
  });

  const scrollToRef = (ref) => {
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.current.focus?.();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = useCallback(() => {
    const errors = {};

    if (!formData.campaignName.trim()) {
      errors.campaignName = "Campaign name is required";
    } else if (formData.campaignName.trim().length < 3) {
      errors.campaignName = "Campaign name must be at least 3 characters";
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    } else if (formData.startDate < todayStr) {
      errors.startDate = "Start date cannot be in the past";
    }

    if (!formData.endDate) {
      errors.endDate = "End date is required";
    } else if (formData.startDate && formData.endDate <= formData.startDate) {
      errors.endDate = "End date must be after start date";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      scrollToRef(refs[firstKey]);
      return false;
    }

    return true;
  }, [formData]);

  // Submit directly — no review step
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!account?.id) {
        setSubmitError("No account information available");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/campaign/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": account.id,
          "x-user-role": account.role || "Merchant",
        },
        body: JSON.stringify({
          campaignName: formData.campaignName,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          displayCoupons: formData.displayCoupons,
          status: "draft",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create campaign");
      }

      const data = await response.json();
      // Go straight to the campaign detail page — the full review with ranges, stores, allocation
      router.push(`/campaign/${data.campaign._id}/ranges`);
    } catch (err) {
      setSubmitError(err.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Create Campaign</h1>
        <p className={styles.headerSubtitle}>Set up your campaign details</p>
      </div>

      {/* API-level error */}
      {submitError && (
        <div className={styles.submitError}>
          <AlertCircle size={16} />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.stepContent}>
          <p className={styles.subtitle}>Fill in the details to create your campaign</p>

          {/* Campaign Name */}
          <div className={styles.formGroup} ref={refs.campaignName}>
            <label htmlFor="campaignName" className={styles.label}>
              Campaign Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="campaignName"
              name="campaignName"
              value={formData.campaignName}
              onChange={handleChange}
              placeholder="E.g. Summer Special"
              className={`${styles.input} ${fieldErrors.campaignName ? styles.inputError : ""}`}
              disabled={submitting}
              autoFocus
            />
            <FieldError message={fieldErrors.campaignName} />
          </div>

          {/* Campaign Description */}
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Campaign Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optionally describe what this campaign is about"
              className={styles.textarea}
              maxLength={500}
              rows={4}
              disabled={submitting}
            />
          </div>

          {/* Campaign Duration */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Campaign Duration</label>
            <div className={styles.dateRow}>
              <div className={styles.formGroup} ref={refs.startDate}>
                <label htmlFor="startDate" className={styles.label}>
                  Start Date <span className={styles.required}>*</span>
                </label>
                <div className={styles.dateInputWrapper}>
                  {!formData.startDate && (
                    <span className={styles.datePlaceholder}>DD/MM/YYYY</span>
                  )}
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    min={todayStr}
                    onChange={handleChange}
                    className={`${styles.dateInput} ${fieldErrors.startDate ? styles.inputError : ""}`}
                    disabled={submitting}
                  />
                  <Calendar size={16} className={styles.dateIcon} />
                </div>
                <FieldError message={fieldErrors.startDate} />
              </div>

              <div className={styles.formGroup} ref={refs.endDate}>
                <label htmlFor="endDate" className={styles.label}>
                  End Date <span className={styles.required}>*</span>
                </label>
                <div className={styles.dateInputWrapper}>
                  {!formData.endDate && (
                    <span className={styles.datePlaceholder}>DD/MM/YYYY</span>
                  )}
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    min={formData.startDate || todayStr}
                    onChange={handleChange}
                    className={`${styles.dateInput} ${fieldErrors.endDate ? styles.inputError : ""}`}
                    disabled={submitting}
                  />
                  <Calendar size={16} className={styles.dateIcon} />
                </div>
                <FieldError message={fieldErrors.endDate} />
              </div>
            </div>
          </div>

          {/* Number of Display Coupons */}
          <div className={styles.formGroup}>
            <label htmlFor="displayCoupons" className={styles.label}>
              Number of Display Coupons <span className={styles.required}>*</span>
            </label>
            <select
              id="displayCoupons"
              name="displayCoupons"
              value={formData.displayCoupons}
              onChange={handleChange}
              className={styles.select}
              disabled={submitting}
            >
              <option value="4">4 Coupons</option>
              <option value="6">6 Coupons</option>
              <option value="8">8 Coupons</option>
            </select>
          </div>

          {/* Buttons */}
          <div className={styles.buttonRow}>
            <Link href="/campaign">
              <button type="button" className={styles.cancelButton} disabled={submitting}>
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
