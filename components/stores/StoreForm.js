'use client';

import React, { useState, useEffect } from 'react';
import FormInput from '@/components/common/FormInput';
import FormButton from '@/components/common/FormButton';
import styles from './StoreForm.module.css';

export default function StoreForm({
  storeData,
  onSubmit,
  onCancel,
  loading = false,
  hideCancel = false,
}) {
  const isEditMode = !!storeData;

  const [formData, setFormData] = useState(
    storeData || {
      store_name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_person: '',
      contact_number: '',
      latitude: null,
      longitude: null,
    }
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, requesting, detected, denied
  const [geoError, setGeoError] = useState(null);

  // Request geolocation on mount (only in create mode)
  useEffect(() => {
    if (!isEditMode && !formData.latitude) {
      requestGeolocation();
    }
  }, [isEditMode, formData.latitude]);

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    setLocationStatus('requesting');
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
        }));
        setLocationStatus('detected');
        setLocationError(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('denied');
        let errorMsg = 'Unable to access your location';

        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enable location services in your browser settings.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location service is temporarily unavailable.';
        }

        setGeoError(errorMsg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Validation rules
  const validateForm = () => {
    const newErrors = {};

    if (!formData.store_name?.trim()) {
      newErrors.store_name = 'Store name is required';
    } else if (formData.store_name.trim().length < 3) {
      newErrors.store_name = 'Store name must be at least 3 characters';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
    }

    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state?.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.pincode?.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (!formData.contact_person?.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }

    if (!formData.contact_number?.trim()) {
      newErrors.contact_number = 'Contact number is required';
    } else if (!/^\d{10,}$/.test(formData.contact_number.replace(/\D/g, ''))) {
      newErrors.contact_number = 'Contact number must be at least 10 digits';
    }

    // Validate location is captured
    if (formData.latitude === null || formData.longitude === null) {
      newErrors.location = 'Store location is required. Please enable location services.';
    }

    return newErrors;
  };

  // Check if a field is valid
  const isFieldValid = (field) => {
    if (!touched[field]) return false;

    const fieldValue = formData[field]?.toString().trim();

    switch (field) {
      case 'store_name':
        return fieldValue && fieldValue.length >= 3;
      case 'contact_number':
        return fieldValue && /^\d{10,}$/.test(fieldValue.replace(/\D/g, ''));
      case 'address':
        return fieldValue && fieldValue.length >= 10;
      case 'pincode':
        return fieldValue && /^\d{6}$/.test(fieldValue.trim());
      case 'city':
      case 'state':
      case 'contact_person':
        return fieldValue && fieldValue.length > 0;
      default:
        return false;
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({
        store_name: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        contact_person: true,
        contact_number: true,
      });
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit form');
    }
  };

  const renderFormField = (fieldName, label, placeholder, type = 'text') => (
    <div className={styles.fieldGroup}>
      <FormInput
        label={label}
        type={type}
        value={formData[fieldName] || ''}
        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        onBlur={() => handleFieldBlur(fieldName)}
        error={touched[fieldName] ? errors[fieldName] : ''}
        placeholder={placeholder}
        disabled={loading}
        className={styles.inputField}
      />
      {touched[fieldName] && isFieldValid(fieldName) && (
        <span className={styles.successMessage}>
          <span>✓</span> Valid
        </span>
      )}
      {touched[fieldName] && errors[fieldName] && (
        <span className={styles.errorMessage}>
          <span>✕</span> {errors[fieldName]}
        </span>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {submitError && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>!</span>
          {submitError}
        </div>
      )}

      {/* Section 1: Basic Information */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Information</h2>
        {renderFormField('store_name', 'Store Name *', 'Enter store name')}
      </div>

      {/* Section 2: Location Information */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Location Information</h2>

        {renderFormField('address', 'Address *', 'Enter detailed address')}

        <div className={styles.twoColumn}>
          {renderFormField('city', 'City *', 'Enter city')}
          {renderFormField('state', 'State *', 'Enter state')}
        </div>

        {renderFormField('pincode', 'Pincode *', 'Enter pincode', 'number')}

        {/* Location Detection UI */}
        <div className={styles.locationSection}>
          <h3 className={styles.locationTitle}>📍 Store Location</h3>

          {geoError && (
            <div className={styles.locationError}>
              <span className={styles.errorIcon}>✕</span>
              <span>{geoError}</span>
            </div>
          )}

          {locationStatus === 'requesting' && (
            <div className={styles.locationStatus}>
              <div className={styles.spinner}></div>
              <span>Detecting your location...</span>
            </div>
          )}

          {locationStatus === 'detected' && formData.latitude && formData.longitude && (
            <div className={styles.locationDetected}>
              <div className={styles.locationCheckmark}>✓</div>
              <div className={styles.locationDetails}>
                <p className={styles.locationLabel}>Current Location Detected</p>
                <p className={styles.coordinates}>
                  Latitude: <span className={styles.value}>{formData.latitude}</span>
                </p>
                <p className={styles.coordinates}>
                  Longitude: <span className={styles.value}>{formData.longitude}</span>
                </p>
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={requestGeolocation}
                  disabled={loading}
                >
                  Refresh Location
                </button>
              </div>
            </div>
          )}

          {locationStatus === 'idle' && !formData.latitude && (
            <button
              type="button"
              className={styles.detectButton}
              onClick={requestGeolocation}
              disabled={loading || locationStatus === 'requesting'}
            >
              Enable Location Services
            </button>
          )}

          {errors.location && (
            <span className={styles.errorMessage}>
              <span>✕</span> {errors.location}
            </span>
          )}
        </div>
      </div>

      {/* Section 3: Contact Information */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Contact Information</h2>

        {renderFormField('contact_person', 'Contact Person *', 'Enter contact person name')}
        {renderFormField('contact_number', 'Contact Number *', 'Enter contact number', 'tel')}
      </div>

      {/* Button Group */}
      <div className={styles.buttonGroup}>
        {!hideCancel && (
          <FormButton
            className={styles.cancelButton}
            type="button"
            variant="cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </FormButton>
        )}
        <FormButton
          className={styles.submitButton}
          type="submit"
          isLoading={loading}
          disabled={loading || (formData.latitude === null && !isEditMode)}
        >
          {isEditMode ? 'Update Store' : 'Create Store'}
        </FormButton>
      </div>
    </form>
  );
}
