"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import Link from "next/link";
import styles from "./page.module.css";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { account } = useAuthContext();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form data across all steps
  const [formData, setFormData] = useState({
    // Step 1: Campaign Details
    campaignName: "",
    description: "",
    startDate: "",
    endDate: "",
    displayCoupons: "6",

    // Step 2: Billing Ranges & Rewards
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

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle range field changes
  const handleRangeChange = (rangeId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      billingRanges: prev.billingRanges.map((range) =>
        range.id === rangeId ? { ...range, [field]: value } : range,
      ),
    }));
  };

  // Handle reward card field changes
  const handleRewardCardChange = (cardId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      rewardCards: prev.rewardCards.map((card) =>
        card.id === cardId ? { ...card, [field]: value } : card,
      ),
    }));
  };

  // Add new billing range
  const handleAddRange = () => {
    const newId = Math.max(...formData.billingRanges.map((r) => r.id), 0) + 1;
    setFormData((prev) => ({
      ...prev,
      billingRanges: [
        ...prev.billingRanges,
        { id: newId, minAmount: "", maxAmount: "" },
      ],
    }));
  };

  // Add new reward card
  const handleAddRewardCard = () => {
    const newId = Math.max(...formData.rewardCards.map((c) => c.id), 0) + 1;
    setFormData((prev) => ({
      ...prev,
      rewardCards: [
        ...prev.rewardCards,
        {
          id: newId,
          rangeId: 1,
          couponName: "",
          rewardType: "fixed_amount",
          rewardAmount: "",
        },
      ],
    }));
  };

  // Validate step 1
  const validateStep1 = () => {
    if (!formData.campaignName.trim()) {
      setError("Campaign name is required");
      return false;
    }

    if (formData.campaignName.trim().length < 3) {
      setError("Campaign name must be at least 3 characters");
      return false;
    }

    if (!formData.startDate) {
      setError("Start date is required");
      return false;
    }

    if (!formData.endDate) {
      setError("End date is required");
      return false;
    }

    const startDateObj = new Date(formData.startDate);
    const endDateObj = new Date(formData.endDate);

    if (startDateObj >= endDateObj) {
      setError("End date must be after start date");
      return false;
    }

    return true;
  };

  // Validate step 2
  const validateStep2 = () => {
    if (formData.billingRanges.length === 0) {
      setError("At least one billing range is required");
      return false;
    }

    for (const range of formData.billingRanges) {
      if (!range.minAmount) {
        setError("Minimum amount is required for all ranges");
        return false;
      }
      if (
        range.maxAmount &&
        parseFloat(range.minAmount) >= parseFloat(range.maxAmount)
      ) {
        setError("Maximum amount must be greater than minimum amount");
        return false;
      }
    }

    if (formData.rewardCards.length === 0) {
      setError("At least one reward card is required");
      return false;
    }

    for (const card of formData.rewardCards) {
      if (!card.rewardAmount) {
        setError("Reward amount is required for all cards");
        return false;
      }
    }

    return true;
  };

  // Navigate to next step
  const handleNextStep = async () => {
    setError(null);

    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    }
  };

  // Navigate to previous step
  const handlePrevStep = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle final form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!account || !account.id) {
        setError("No account information available");
        setSubmitting(false);
        return;
      }

      // Create campaign with all data
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

      // Basic info saved as draft → go straight to the reward-ranges step.
      setTimeout(() => {
        router.push(`/campaign/${data.campaign._id}/ranges`);
      }, 500);
    } catch (err) {
      setError(err.message || "Failed to create campaign");
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
      {/* Header */}
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Create Campaign</h1>
        <p className={styles.headerSubtitle}>
          Set up your campaign step by step
        </p>
      </div>

      {/* Step Indicator */}
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

      {/* Messages */}
      {error && <div className={styles.errorMessage}>{error}</div>}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* STEP 1: Campaign Details */}
        {currentStep === 1 && (
          <div className={styles.stepContent}>
            <p className={styles.subtitle}>Set up your campaign details</p>

            {/* Campaign Name */}
            <div className={styles.formGroup}>
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
                className={styles.input}
                required
                disabled={submitting}
              />
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
                <div className={styles.formGroup}>
                  <label htmlFor="startDate" className={styles.label}>
                    Start Date <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className={styles.input}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="endDate" className={styles.label}>
                    End Date <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className={styles.input}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Number of Display Coupons */}
            <div className={styles.formGroup}>
              <label htmlFor="displayCoupons" className={styles.label}>
                Number of Display Coupons{" "}
                <span className={styles.required}>*</span>
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

            {/* Step 1 Navigation */}
            <div className={styles.buttonRow}>
              <Link href="/campaign">
                <button
                  type="button"
                  className={styles.cancelButton}
                  disabled={submitting}
                >
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

        {/* STEP 3: Campaign Preview */}
        {currentStep === 2 && (
          <div className={styles.stepContent}>
            <p className={styles.subtitle}>
              Review your campaign details before saving as a draft
            </p>

            {/* Summary */}
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
                <span>
                  {formData.startDate} to {formData.endDate}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Coupons:</span>
                <span>{formData.displayCoupons}</span>
              </div>
            </div>

            {/* Step 3 Navigation */}
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
