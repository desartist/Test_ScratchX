'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './InventoryForm.module.css';

/**
 * InventoryForm Component
 *
 * Allocation form for distributing campaign inventory to locations.
 * Validates fields individually with error messages and success checkmarks.
 * Checks available quantity based on campaign's totalQuantity - distributeQuantity.
 *
 * Props:
 *   - onSubmit: async function called with { campaignId, locationId, quantity }
 *   - onCancel: function called when user clicks Cancel
 *   - loading: boolean, disables form when true
 *   - campaigns: array of { id, name, totalQuantity, distributeQuantity }
 *   - locations: array of { id, name, address }
 *
 * State:
 *   - formData: { campaign: '', location: '', quantity: '' }
 *   - errors: { campaign: '', location: '', quantity: '' }
 *   - validFields: { campaign: false, location: false, quantity: false }
 *   - availableQuantity: number, updated when campaign changes
 */
export default function InventoryForm({ onSubmit, onCancel, loading = false, campaigns = [], locations = [] }) {
  const { user } = useAuthContext();

  // Form state
  const [formData, setFormData] = useState({
    campaign: '',
    location: '',
    quantity: '',
  });

  // Validation state
  const [errors, setErrors] = useState({
    campaign: '',
    location: '',
    quantity: '',
  });

  const [validFields, setValidFields] = useState({
    campaign: false,
    location: false,
    quantity: false,
  });

  // Available quantity from selected campaign
  const [availableQuantity, setAvailableQuantity] = useState(0);

  // Update available quantity when campaign changes
  useEffect(() => {
    if (formData.campaign) {
      const selectedCampaign = campaigns.find(c => c.id === formData.campaign);
      if (selectedCampaign) {
        const available = selectedCampaign.totalQuantity - (selectedCampaign.distributeQuantity || 0);
        setAvailableQuantity(Math.max(0, available));
      }
    } else {
      setAvailableQuantity(0);
    }
  }, [formData.campaign, campaigns]);

  /**
   * Validate a single field
   * Returns error message or empty string if valid
   */
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'campaign':
        if (!value) {
          return 'Campaign is required';
        }
        return '';

      case 'location':
        if (!value) {
          return 'Location is required';
        }
        return '';

      case 'quantity':
        if (!value) {
          return 'Quantity is required';
        }
        const qty = parseInt(value, 10);
        if (isNaN(qty) || qty <= 0) {
          return 'Quantity must be greater than 0';
        }
        if (qty > availableQuantity) {
          return `Quantity cannot exceed available (${availableQuantity})`;
        }
        return '';

      default:
        return '';
    }
  };

  /**
   * Handle input change - clears error for that field
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    // Validate the field
    const error = validateField(name, value);
    const isValid = error === '';
    setValidFields(prev => ({
      ...prev,
      [name]: isValid,
    }));
  };

  /**
   * Validate entire form before submission
   * Returns true if all fields are valid
   */
  const validateForm = () => {
    const newErrors = {};
    const newValidFields = {};

    // Validate each field
    Object.keys(formData).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      newErrors[fieldName] = error;
      newValidFields[fieldName] = error === '';
    });

    setErrors(newErrors);
    setValidFields(newValidFields);

    // Return true only if all fields are valid
    return Object.values(newValidFields).every(valid => valid);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        campaignId: formData.campaign,
        locationId: formData.location,
        quantity: parseInt(formData.quantity, 10),
      });
    } catch (error) {
      console.error('Error submitting inventory allocation:', error);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Campaign Select */}
      <div className={styles.fieldGroup}>
        <label htmlFor="campaign" className={styles.label}>
          Campaign
        </label>
        <select
          id="campaign"
          name="campaign"
          value={formData.campaign}
          onChange={handleInputChange}
          disabled={loading}
          className={`${styles.select} ${
            errors.campaign ? styles.error : ''
          } ${validFields.campaign && !errors.campaign ? styles.success : ''}`}
        >
          <option value="">Select a campaign</option>
          {campaigns.map(campaign => {
            const available = campaign.totalQuantity - (campaign.distributeQuantity || 0);
            return (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} (Available: {Math.max(0, available)})
              </option>
            );
          })}
        </select>
        {errors.campaign && (
          <div className={styles.errorMessage}>
            <span>⚠</span>
            {errors.campaign}
          </div>
        )}
        {validFields.campaign && !errors.campaign && (
          <span className={styles.checkmark}>✓</span>
        )}
      </div>

      {/* Location Select */}
      <div className={styles.fieldGroup}>
        <label htmlFor="location" className={styles.label}>
          Location
        </label>
        <select
          id="location"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          disabled={loading}
          className={`${styles.select} ${
            errors.location ? styles.error : ''
          } ${validFields.location && !errors.location ? styles.success : ''}`}
        >
          <option value="">Select a location</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
              {location.address ? ` (${location.address})` : ''}
            </option>
          ))}
        </select>
        {errors.location && (
          <div className={styles.errorMessage}>
            <span>⚠</span>
            {errors.location}
          </div>
        )}
        {validFields.location && !errors.location && (
          <span className={styles.checkmark}>✓</span>
        )}
      </div>

      {/* Quantity Input */}
      <div className={styles.fieldGroup}>
        <label htmlFor="quantity" className={styles.label}>
          Quantity
        </label>
        <input
          id="quantity"
          type="number"
          name="quantity"
          min="1"
          value={formData.quantity}
          onChange={handleInputChange}
          disabled={loading || !formData.campaign}
          placeholder="Enter quantity"
          className={`${styles.input} ${
            errors.quantity ? styles.error : ''
          } ${validFields.quantity && !errors.quantity ? styles.success : ''}`}
        />
        {availableQuantity > 0 && (
          <div className={styles.infoMessage}>
            Available: {availableQuantity} units
          </div>
        )}
        {errors.quantity && (
          <div className={styles.errorMessage}>
            <span>⚠</span>
            {errors.quantity}
          </div>
        )}
        {validFields.quantity && !errors.quantity && (
          <span className={styles.checkmark}>✓</span>
        )}
      </div>

      {/* Button Group */}
      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={styles.cancelButton}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? (
            <>
              <span className={styles.loadingSpinner} />
              Allocating...
            </>
          ) : (
            'Allocate'
          )}
        </button>
      </div>
    </form>
  );
}
