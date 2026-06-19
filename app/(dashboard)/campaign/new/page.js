"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import Link from "next/link";
import { Calendar, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

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

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Refs for scroll-to-error
  const refs = {
    campaignName: useRef(null),
    startDate: useRef(null),
    endDate: useRef(null),
    billingRanges: useRef(null),
    rewardCards: useRef(null),
  };

  const [formData, setFormData] = useState({
    campaignName: "",
    description: "",
    startDate: "",
    endDate: "",
    displayCoupons: "6",
    billingRanges: [
      { id: 1, minAmount: "", maxAmount: "" },
      { id: 2, minAmount: "", maxAmount: "" },
    ],
    rewardCards: [
      {
        id: 1,
        rangeId: 1,
        couponName: "Coupon 1",
        rewardType: "fixed_amount",
        rewardAmount: "",
      },
    ],
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
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRangeChange = (rangeId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      billingRanges: prev.billingRanges.map((r) =>
        r.id === rangeId ? { ...r, [field]: value } : r,
      ),
    }));
  };

  const handleRewardCardChange = (cardId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rewardCards: prev.rewardCards.map((c) =>
        c.id === cardId ? { ...c, [field]: value } : c,
      ),
    }));
  };

  const handleAddRange = () => {
    const newId = Math.max(...formData.billingRanges.map((r) => r.id), 0) + 1;
    setFormData((prev) => ({
      ...prev,
      billingRanges: [...prev.billingRanges, { id: newId, minAmount: "", maxAmount: "" }],
    }));
  };

  const handleAddRewardCard = () => {
    const newId = Math.max(...formData.rewardCards.map((c) => c.id), 0) + 1;
    setFormData((prev) => ({
      ...prev,
      rewardCards: [
        ...prev.rewardCards,
        { id: newId, rangeId: 1, couponName: "", rewardType: "fixed_amount", rewardAmount: "" },
      ],
    }));
  };

  const validateStep1 = useCallback(() => {
    const errors = {};

    if (!formData.campaignName.trim()) {
      errors.campaignName = "Campaign name is required";
    } else if (formData.campaignName.trim().length < 3) {
      errors.campaignName = "Campaign name must be at least 3 characters";
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      errors.endDate = "End date is required";
    } else if (formData.startDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      errors.endDate = "End date must be after start date";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Scroll to first error field
      const firstKey = Object.keys(errors)[0];
      scrollToRef(refs[firstKey]);
      return false;
    }

    return true;
  }, [formData]);

  const validateStep2 = useCallback(() => {
    const errors = {};

    if (formData.billingRanges.length === 0) {
      errors.billingRanges = "At least one billing range is required";
    } else {
      for (const range of formData.billingRanges) {
        if (!range.minAmount) {
          errors.billingRanges = "Minimum amount is required for all ranges";
          break;
        }
        if (range.maxAmount && parseFloat(range.minAmount) >= parseFloat(range.maxAmount)) {
          errors.billingRanges = "Maximum amount must be greater than minimum amount";
          break;
        }
      }
    }

    if (formData.rewardCards.length === 0) {
      errors.rewardCards = "At least one reward card is required";
    } else {
      for (const card of formData.rewardCards) {
        if (!card.rewardAmount) {
          errors.rewardCards = "Reward amount is required for all cards";
          break;
        }
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      scrollToRef(refs[firstKey]);
      return false;
    }

    return true;
  }, [formData]);

  const handleNextStep = async () => {
    setFieldErrors({});
    setSubmitError(null);

    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setFieldErrors({});
    setSubmitError(null);
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

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
          status: "draft",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create campaign");
      }

      const data = await response.json();
      setSuccessMessage("Campaign created! Now set up your reward ranges.");

      setTimeout(() => {
        router.push(`/campaign/${data.campaign._id}/ranges`);
      }, 500);
    } catch (err) {
      setSubmitError(err.message || "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, name: "Details" },
    { number: 2, name: "Review" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Create Campaign</h1>
        <p className={styles.headerSubtitle}>Set up your campaign step by step</p>
      </div>

      <div className={styles.stepIndicatorContainer}>
        <div className={styles.stepCircles}>
          {steps.map((step) => (
            <div key={step.number} className={styles.stepCircleWrapper}>
              <div
                className={`${styles.stepCircle} ${
                  step.number === currentStep
                    ? styles.active
                    : step.number < currentStep
                    ? styles.completed
                    : styles.upcoming
                }`}
              >
                {step.number < currentStep ? "✓" : step.number}
              </div>
              <p className={styles.stepName}>{step.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Submit-level error (API failure) */}
      {submitError && (
        <div className={styles.submitError}>
          <AlertCircle size={16} />
          {submitError}
        </div>
      )}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className={styles.stepContent}>
            <p className={styles.subtitle}>Set up your campaign details</p>

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
                    <Calendar size={16} className={styles.dateIcon} />
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className={`${styles.dateInput} ${fieldErrors.startDate ? styles.inputError : ""}`}
                      disabled={submitting}
                    />
                  </div>
                  <FieldError message={fieldErrors.startDate} />
                </div>

                <div className={styles.formGroup} ref={refs.endDate}>
                  <label htmlFor="endDate" className={styles.label}>
                    End Date <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.dateInputWrapper}>
                    <Calendar size={16} className={styles.dateIcon} />
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className={`${styles.dateInput} ${fieldErrors.endDate ? styles.inputError : ""}`}
                      disabled={submitting}
                    />
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
                <option value="3">3 Coupons</option>
                <option value="6">6 Coupons</option>
                <option value="9">9 Coupons</option>
                <option value="12">12 Coupons</option>
              </select>
            </div>

            <div className={styles.buttonRow}>
              <Link href="/campaign">
                <button type="button" className={styles.cancelButton} disabled={submitting}>
                  Cancel
                </button>
              </Link>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleNextStep}
                disabled={submitting}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Review */}
        {currentStep === 2 && (
          <div className={styles.stepContent}>
            <p className={styles.subtitle}>Review your campaign details before saving as a draft</p>

            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Campaign Name:</span>
                <span>{formData.campaignName}</span>
              </div>
              {formData.description && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Description:</span>
                  <span>{formData.description}</span>
                </div>
              )}
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Duration:</span>
                <span>{formData.startDate} to {formData.endDate}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Coupons:</span>
                <span>{formData.displayCoupons}</span>
              </div>
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handlePrevStep}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Create Campaign"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
