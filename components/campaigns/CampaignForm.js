'use client';

import React, { useState } from 'react';
import FormButton from '@/components/common/FormButton';
import FormError from '@/components/common/FormError';
import styles from './CampaignForm.module.css';

export default function CampaignForm({
  campaignData,
  onSubmit,
  onCancel,
  loading = false
}) {
  const isEditMode = !!campaignData;
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState(campaignData || {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    rewardType: '',
    rewardValue: '',
    rewardUnit: '',
    distributionMethod: '',
    totalQuantity: '',
    targetAudience: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name?.trim() || formData.name.trim().length < 5) {
        newErrors.name = 'Campaign name must be at least 5 characters';
      }
      if (!formData.description?.trim() || formData.description.trim().length < 20) {
        newErrors.description = 'Description must be at least 20 characters';
      }
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required';
      }
      if (!formData.endDate) {
        newErrors.endDate = 'End date is required';
      } else if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    } else if (step === 2) {
      if (!formData.rewardType) {
        newErrors.rewardType = 'Reward type is required';
      }
      if (!formData.rewardValue || Number(formData.rewardValue) <= 0) {
        newErrors.rewardValue = 'Reward value must be greater than 0';
      }
      if (!formData.rewardUnit) {
        newErrors.rewardUnit = 'Reward unit is required';
      }
    } else if (step === 3) {
      if (!formData.distributionMethod) {
        newErrors.distributionMethod = 'Distribution method is required';
      }
      if (!formData.totalQuantity || Number(formData.totalQuantity) <= 0) {
        newErrors.totalQuantity = 'Total quantity must be greater than 0';
      }
    }

    return newErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setCurrentStep(current => Math.min(current + 1, 3));
    setErrors({});
  };

  const handlePrev = () => {
    setCurrentStep(current => Math.max(current - 1, 1));
    setErrors({});
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate all steps
    const allErrors = {
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3)
    };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setCurrentStep(1);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit campaign');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Step Indicator */}
      <div className={styles.stepIndicator}>
        <div className={styles.stepConnector} style={{
          width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%'
        }}></div>
        {[1, 2, 3].map(step => (
          <div key={step} className={styles.stepItem}>
            <div
              className={`${styles.stepCircle} ${currentStep === step ? styles.active : ''
                } ${currentStep > step ? styles.completed : ''}`}
            >
              {currentStep > step ? '✓' : step}
            </div>
            <div
              className={`${styles.stepLabel} ${currentStep === step ? styles.active : ''
                } ${currentStep > step ? styles.completed : ''}`}
            >
              Step {step}
            </div>
          </div>
        ))}
      </div>

      {submitError && <FormError message={submitError} />}

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className={`${styles.stepContent} ${styles.active}`}>
          <h3 className={styles.stepTitle}>Campaign Basic Information</h3>

          {/* Campaign Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="name">Campaign Name</label>
            <input
              id="name"
              type="text"
              className={`${styles.inputField} ${errors.name ? styles.error : ''}`}
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter campaign name (minimum 5 characters)"
              disabled={loading}
              required
            />
            {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="description">Description</label>
            <textarea
              id="description"
              className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Enter campaign description (minimum 20 characters)"
              disabled={loading}
              required
            />
            {errors.description && <span className={styles.errorMessage}>{errors.description}</span>}
          </div>

          {/* Start Date */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              className={`${styles.inputField} ${errors.startDate ? styles.error : ''}`}
              value={formData.startDate}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              disabled={loading}
              required
            />
            {errors.startDate && <span className={styles.errorMessage}>{errors.startDate}</span>}
          </div>

          {/* End Date */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              className={`${styles.inputField} ${errors.endDate ? styles.error : ''}`}
              value={formData.endDate}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              disabled={loading}
              required
            />
            {errors.endDate && <span className={styles.errorMessage}>{errors.endDate}</span>}
          </div>
        </div>
      )}

      {/* Step 2: Rewards */}
      {currentStep === 2 && (
        <div className={`${styles.stepContent} ${styles.active}`}>
          <h3 className={styles.stepTitle}>Reward Configuration</h3>

          {/* Reward Type */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="rewardType">Reward Type</label>
            <select
              id="rewardType"
              className={`${styles.select} ${errors.rewardType ? styles.error : ''}`}
              value={formData.rewardType}
              onChange={(e) => handleFieldChange('rewardType', e.target.value)}
              disabled={loading}
              required
            >
              <option value="">Select reward type</option>
              <option value="Discount">Discount</option>
              <option value="Cashback">Cashback</option>
              <option value="Gift">Gift</option>
            </select>
            {errors.rewardType && <span className={styles.errorMessage}>{errors.rewardType}</span>}
          </div>

          {/* Reward Value */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="rewardValue">Reward Value</label>
            <input
              id="rewardValue"
              type="number"
              className={`${styles.inputField} ${errors.rewardValue ? styles.error : ''}`}
              value={formData.rewardValue}
              onChange={(e) => handleFieldChange('rewardValue', e.target.value)}
              placeholder="Enter reward amount (must be greater than 0)"
              disabled={loading}
              min="0"
              step="0.01"
              required
            />
            {errors.rewardValue && <span className={styles.errorMessage}>{errors.rewardValue}</span>}
          </div>

          {/* Reward Unit */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="rewardUnit">Reward Unit</label>
            <select
              id="rewardUnit"
              className={`${styles.select} ${errors.rewardUnit ? styles.error : ''}`}
              value={formData.rewardUnit}
              onChange={(e) => handleFieldChange('rewardUnit', e.target.value)}
              disabled={loading}
              required
            >
              <option value="">Select unit</option>
              <option value="%">Percentage (%)</option>
              <option value="Amount">Fixed Amount</option>
            </select>
            {errors.rewardUnit && <span className={styles.errorMessage}>{errors.rewardUnit}</span>}
          </div>
        </div>
      )}

      {/* Step 3: Distribution */}
      {currentStep === 3 && (
        <div className={`${styles.stepContent} ${styles.active}`}>
          <h3 className={styles.stepTitle}>Distribution Settings</h3>

          {/* Distribution Method */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="distributionMethod">Distribution Method</label>
            <select
              id="distributionMethod"
              className={`${styles.select} ${errors.distributionMethod ? styles.error : ''}`}
              value={formData.distributionMethod}
              onChange={(e) => handleFieldChange('distributionMethod', e.target.value)}
              disabled={loading}
              required
            >
              <option value="">Select method</option>
              <option value="QR">QR Code</option>
              <option value="SMS">SMS</option>
              <option value="Email">Email</option>
            </select>
            {errors.distributionMethod && <span className={styles.errorMessage}>{errors.distributionMethod}</span>}
          </div>

          {/* Total Quantity */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="totalQuantity">Total Quantity</label>
            <input
              id="totalQuantity"
              type="number"
              className={`${styles.inputField} ${errors.totalQuantity ? styles.error : ''}`}
              value={formData.totalQuantity}
              onChange={(e) => handleFieldChange('totalQuantity', e.target.value)}
              placeholder="Number of scratches (must be greater than 0)"
              disabled={loading}
              min="1"
              required
            />
            {errors.totalQuantity && <span className={styles.errorMessage}>{errors.totalQuantity}</span>}
          </div>

          {/* Target Audience (Optional) */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="targetAudience">Target Audience (Optional)</label>
            <input
              id="targetAudience"
              type="text"
              className={styles.inputField}
              value={formData.targetAudience}
              onChange={(e) => handleFieldChange('targetAudience', e.target.value)}
              placeholder="Describe target audience (e.g., 'New customers', 'VIP members')"
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className={styles.buttonGroup}>
        {currentStep > 1 && (
          <FormButton
            type="button"
            variant="secondary"
            onClick={handlePrev}
            disabled={loading}
          >
            ← Previous
          </FormButton>
        )}

        {currentStep < 3 && (
          <FormButton
            type="button"
            onClick={handleNext}
            disabled={loading}
          >
            Next →
          </FormButton>
        )}

        {currentStep === 3 && (
          <FormButton
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {isEditMode ? 'Update Campaign' : 'Create Campaign'}
          </FormButton>
        )}

        <FormButton
          type="button"
          variant="cancel"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </FormButton>
      </div>
    </form>
  );
}
