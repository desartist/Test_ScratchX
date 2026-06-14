'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';
import Link from 'next/link';
import styles from './page.module.css';

export default function CreateStorePage() {
  const router = useRouter();
  const { account } = useAuthContext();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Geolocation state
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, requesting, detected, denied
  const [geoError, setGeoError] = useState(null);

  // Form data across all steps
  const [formData, setFormData] = useState({
    // Step 1: Store Info
    store_name: '',
    contact_person: '',
    contact_number: '',

    // Step 2: Location
    latitude: null,
    longitude: null,
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Form validation errors
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Request geolocation on mount (only for step 2)
  useEffect(() => {
    if (currentStep === 2 && !formData.latitude && locationStatus === 'idle') {
      requestGeolocation();
    }
  }, [currentStep]);

  // Request geolocation from browser
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

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  // Validate step 1: Store Info
  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.store_name.trim()) {
      newErrors.store_name = 'Store name is required';
    } else if (formData.store_name.trim().length < 3) {
      newErrors.store_name = 'Store name must be at least 3 characters';
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }

    if (!formData.contact_number.trim()) {
      newErrors.contact_number = 'Contact number is required';
    } else if (!/^\d{10,}$/.test(formData.contact_number.replace(/\D/g, ''))) {
      newErrors.contact_number = 'Contact number must be at least 10 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  // Validate step 2: Location
  const validateStep2 = () => {
    const newErrors = {};

    if (formData.latitude === null || formData.longitude === null) {
      newErrors.location = 'Store location is required. Please enable location services.';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
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
        setError('No account information available');
        setSubmitting(false);
        return;
      }

      // Create store with all data
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': account.id,
          'x-user-role': account.role || 'Merchant',
        },
        body: JSON.stringify({
          store_name: formData.store_name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          contact_person: formData.contact_person,
          contact_number: formData.contact_number,
          latitude: formData.latitude,
          longitude: formData.longitude,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create store');
      }

      const data = await response.json();
      setSuccessMessage('Store created successfully!');

      // Redirect to stores page after 1 second
      setTimeout(() => {
        router.push('/stores');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, name: 'Store Info' },
    { number: 2, name: 'Location' },
    { number: 3, name: 'Review' },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Setup Your Store</h1>
        <p className={styles.headerSubtitle}>Add your store details and location</p>
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
                {step.number < currentStep ? '✓' : step.number}
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

        {/* STEP 1: Store Info */}
        {currentStep === 1 && (
          <div className={styles.stepContent}>
            <p className={styles.subtitle}>
              Let's set up your store
            </p>

            {/* Store Name */}
            <div className={styles.formGroup}>
              <label htmlFor="store_name" className={styles.label}>
                Store Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="store_name"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('store_name')}
                placeholder="E.g. Downtown Store"
                className={styles.input}
                required
                disabled={submitting}
              />
              {touched.store_name && errors.store_name && (
                <span className={styles.errorText}>{errors.store_name}</span>
              )}
            </div>

            {/* Contact Person */}
            <div className={styles.formGroup}>
              <label htmlFor="contact_person" className={styles.label}>
                Contact Person <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('contact_person')}
                placeholder="E.g. John Smith"
                className={styles.input}
                required
                disabled={submitting}
              />
              {touched.contact_person && errors.contact_person && (
                <span className={styles.errorText}>{errors.contact_person}</span>
              )}
            </div>

            {/* Contact Number */}
            <div className={styles.formGroup}>
              <label htmlFor="contact_number" className={styles.label}>
                Contact Number <span className={styles.required}>*</span>
              </label>
              <input
                type="tel"
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('contact_number')}
                placeholder="E.g. 98765 43210"
                className={styles.input}
                required
                disabled={submitting}
              />
              {touched.contact_number && errors.contact_number && (
                <span className={styles.errorText}>{errors.contact_number}</span>
              )}
            </div>

            {/* Step 1 Navigation */}
            <div className={styles.buttonRow}>
              <Link href="/stores">
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

        {/* STEP 2: Location */}
        {currentStep === 2 && (
          <div className={styles.stepContent}>
            <p className={styles.subtitle}>
              Share your store's location for accurate customer verification
            </p>

            {/* Location Detection UI */}
            <div className={styles.locationSection}>
              <div className={styles.locationHeader}>
                <h3 className={styles.locationTitle}>Store Location</h3>
              </div>

              {geoError && (
                <div className={styles.locationError}>
                  <span className={styles.errorIcon}>✕</span>
                  <span>{geoError}</span>
                </div>
              )}

              {errors.location && (
                <div className={styles.locationError}>
                  <span className={styles.errorIcon}>✕</span>
                  <span>{errors.location}</span>
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
                    <p className={styles.locationLabel}>Location Verified</p>
                    <p className={styles.coordinates}>
                      Latitude: <span className={styles.value}>{formData.latitude}</span>
                    </p>
                    <p className={styles.coordinates}>
                      Longitude: <span className={styles.value}>{formData.longitude}</span>
                    </p>
                    <button
                      type="button"
                      className={styles.useCurrentButton}
                      onClick={requestGeolocation}
                      disabled={submitting || locationStatus === 'requesting'}
                    >
                      Update Location
                    </button>
                  </div>
                </div>
              )}

              {locationStatus === 'idle' && !formData.latitude && (
                <button
                  type="button"
                  className={styles.useCurrentButton}
                  onClick={requestGeolocation}
                  disabled={submitting || locationStatus === 'requesting'}
                >
                  Use Current Location
                </button>
              )}

              {locationStatus === 'denied' && (
                <button
                  type="button"
                  className={styles.useCurrentButton}
                  onClick={requestGeolocation}
                  disabled={submitting || locationStatus === 'requesting'}
                >
                  Use Current Location
                </button>
              )}
            </div>

            {/* Address */}
            <div className={styles.formGroup}>
              <label htmlFor="address" className={styles.label}>
                Address <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('address')}
                placeholder="E.g. 123 Main Street, Suite 100"
                className={styles.input}
                required
                disabled={submitting}
              />
              {touched.address && errors.address && (
                <span className={styles.errorText}>{errors.address}</span>
              )}
            </div>

            {/* City and State Row */}
            <div className={styles.twoColumnRow}>
              <div className={styles.formGroup}>
                <label htmlFor="city" className={styles.label}>
                  City <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur('city')}
                  placeholder="E.g. New York"
                  className={styles.input}
                  required
                  disabled={submitting}
                />
                {touched.city && errors.city && (
                  <span className={styles.errorText}>{errors.city}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="state" className={styles.label}>
                  State <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur('state')}
                  placeholder="E.g. NY"
                  className={styles.input}
                  required
                  disabled={submitting}
                />
                {touched.state && errors.state && (
                  <span className={styles.errorText}>{errors.state}</span>
                )}
              </div>
            </div>

            {/* Pincode */}
            <div className={styles.formGroup}>
              <label htmlFor="pincode" className={styles.label}>
                Pincode <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                onBlur={() => handleFieldBlur('pincode')}
                placeholder="E.g. 100001"
                className={styles.input}
                maxLength="6"
                required
                disabled={submitting}
              />
              {touched.pincode && errors.pincode && (
                <span className={styles.errorText}>{errors.pincode}</span>
              )}
            </div>

            {/* Step 2 Navigation */}
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

        {/* STEP 3: Review */}
        {currentStep === 3 && (
          <div className={styles.stepContent}>
            <p className={styles.subtitle}>
              Review your store details before creating
            </p>

            {/* Summary */}
            <div className={styles.summary}>
              <div className={styles.summarySection}>
                <h4 className={styles.summaryTitle}>Store Information</h4>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Store Name:</span>
                  <span>{formData.store_name}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Contact Person:</span>
                  <span>{formData.contact_person}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Contact Number:</span>
                  <span>{formData.contact_number}</span>
                </div>
              </div>

              <div className={styles.summarySection}>
                <h4 className={styles.summaryTitle}>Location Details</h4>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Address:</span>
                  <span>{formData.address}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>City:</span>
                  <span>{formData.city}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>State:</span>
                  <span>{formData.state}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Pincode:</span>
                  <span>{formData.pincode}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Coordinates:</span>
                  <span>{formData.latitude}, {formData.longitude}</span>
                </div>
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
                {submitting ? 'Creating...' : 'Create Store'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
