'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import StoreWelcomeScreen from '@/components/stores/StoreWelcomeScreen';
import styles from './page.module.css';

export default function CreateStorePage() {
  const router = useRouter();
  const { account } = useAuthContext();

  // Step management (0 = welcome screen, 1-3 = form steps)
  const [currentStep, setCurrentStep] = useState(null); // null = loading/checking
  const [hasExistingStores, setHasExistingStores] = useState(false);
  const [isCheckingStores, setIsCheckingStores] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Geolocation state
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, requesting, detected, denied
  const [geoError, setGeoError] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null); // { landmark, area, city, display }
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalData, setLocationModalData] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
    isGeocoding: false,
  });

  // Form data across all steps
  const [formData, setFormData] = useState({
    // Step 1: Store Info
    store_name: '',
    contact_person: '',
    contact_number: '',
    business_type: '',

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
  const formRef = useRef(null);

  // Check if user has existing stores and skip welcome screen if they do
  useEffect(() => {
    const checkExistingStores = async () => {
      if (!account || !account.id) {
        console.log('[CreateStorePage] No account info, showing welcome screen');
        setCurrentStep(0);
        setIsCheckingStores(false);
        return;
      }

      setIsCheckingStores(true);
      try {
        console.log('[CreateStorePage] Checking for existing stores...');
        console.log('[CreateStorePage] Account:', { id: account.id, role: account.role });

        const response = await fetch('/api/stores', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': account.id,
            'x-user-role': account.role || 'Merchant',
          },
        });

        console.log('[CreateStorePage] API Response Status:', response.status);

        if (response.ok) {
          const responseData = await response.json();
          console.log('[CreateStorePage] API Response:', responseData);

          const stores = responseData.data || responseData.stores || [];
          console.log('[CreateStorePage] Found', stores.length, 'store(s)');

          if (Array.isArray(stores) && stores.length > 0) {
            // User has existing stores - skip welcome screen, go directly to form
            console.log('[CreateStorePage] User has stores - going to form (Step 1)');
            setHasExistingStores(true);
            setCurrentStep(1);
          } else {
            // No existing stores - show welcome screen
            console.log('[CreateStorePage] No stores found - showing welcome screen');
            setHasExistingStores(false);
            setCurrentStep(0);
          }
        } else {
          console.warn('[CreateStorePage] API error status:', response.status);
          const errorData = await response.json().catch(() => ({}));
          console.warn('[CreateStorePage] API error data:', errorData);
          // Default to welcome screen on error
          setCurrentStep(0);
        }
      } catch (err) {
        console.error('[CreateStorePage] Error checking stores:', err);
        // Default to welcome screen on error
        setCurrentStep(0);
      } finally {
        setIsCheckingStores(false);
      }
    };

    checkExistingStores();
  }, [account]);

  // Scroll to first error field whenever errors change
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    const el = formRef.current?.querySelector('[data-error="true"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errors]);

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
    setLocationInfo(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const lat = parseFloat(latitude.toFixed(6));
        const lng = parseFloat(longitude.toFixed(6));
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng, _geoSource: 'gps' }));

        // Reverse geocode via Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const geo = await res.json();
          const a = geo.address || {};
          const landmark =
            a.amenity || a.shop || a.tourism || a.building ||
            a.road || a.pedestrian || a.suburb || null;
          const area = a.suburb || a.neighbourhood || a.village || a.town || null;
          const city = a.city || a.town || a.village || a.county || null;
          const state = a.state || null;
          const pincode = a.postcode ? a.postcode.replace(/\D/g, '').slice(0, 6) : null;
          setLocationInfo({
            landmark,
            area,
            city,
            state,
            display: geo.display_name
              ? geo.display_name.split(',').slice(0, 3).join(',')
              : null,
          });
          // Auto-fill city, state, pincode from reverse geocode (address must be filled by user)
          setFormData((prev) => ({
            ...prev,
            city: prev.city || city || '',
            state: prev.state || state || '',
            pincode: prev.pincode || pincode || '',
          }));
        } catch {
          setLocationInfo(null);
        }

        setLocationStatus('detected');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('denied');

        if (error.code === error.PERMISSION_DENIED) {
          // Show modal for manual address entry
          setGeoError('We couldn\'t access your location.');
          setShowLocationModal(true);
          setLocationModalData(prev => ({
            ...prev,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
          }));
        } else if (error.code === error.TIMEOUT) {
          setGeoError('Location request timed out. Please try again.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError('Location service is temporarily unavailable.');
        } else {
          setGeoError('Unable to access your location.');
        }
      },
      { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  };

  // Forward geocode address → lat/lng when GPS is unavailable
  // Tries progressively simpler queries to maximise chances of a hit
  const geocodeAddress = async () => {
    const { address, city, state, pincode } = formData;
    if (!city && !pincode) return;

    setLocationStatus('requesting');
    setGeoError(null);

    // Queries from most specific to least — first match wins
    const queries = [
      [address, city, state, pincode],
      [city, state, pincode],
      [pincode, 'India'],
      [city, state, 'India'],
    ].map(parts => parts.filter(Boolean).join(', ')).filter(Boolean);

    const nominatim = async (q) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
      return res.json();
    };

    try {
      for (const q of queries) {
        const results = await nominatim(q);
        if (results && results[0]) {
          const lat = parseFloat(parseFloat(results[0].lat).toFixed(6));
          const lng = parseFloat(parseFloat(results[0].lon).toFixed(6));
          setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng, _geoSource: 'address' }));
          setLocationStatus('detected');
          setLocationInfo({ display: results[0].display_name?.split(',').slice(0, 3).join(',') });
          return;
        }
      }
      setLocationStatus('denied');
      setGeoError('Could not find this location. Please check your city/pincode and try again.');
    } catch {
      setLocationStatus('denied');
      setGeoError('Failed to look up address. Please check your internet connection and try again.');
    }
  };

  // Handle manual address geocoding from modal
  const handleModalGeocodeAddress = async () => {
    const { address, city, state, pincode } = locationModalData;

    if (!address.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setGeoError('Please fill in all address fields');
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      setGeoError('Pincode must be exactly 6 digits');
      return;
    }

    setLocationModalData(prev => ({ ...prev, isGeocoding: true }));
    setGeoError(null);

    // Queries from most specific to least — first match wins
    const queries = [
      [address, city, state, pincode],
      [city, state, pincode],
      [pincode, 'India'],
      [city, state, 'India'],
    ].map(parts => parts.filter(Boolean).join(', ')).filter(Boolean);

    const nominatim = async (q) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      );
      return res.json();
    };

    try {
      for (const q of queries) {
        const results = await nominatim(q);
        if (results && results[0]) {
          const lat = parseFloat(parseFloat(results[0].lat).toFixed(6));
          const lng = parseFloat(parseFloat(results[0].lon).toFixed(6));

          // Update form data with modal data and coordinates
          setFormData((prev) => ({
            ...prev,
            address: locationModalData.address,
            city: locationModalData.city,
            state: locationModalData.state,
            pincode: locationModalData.pincode,
            latitude: lat,
            longitude: lng,
            _geoSource: 'address',
          }));

          setLocationStatus('detected');
          setLocationInfo({ display: results[0].display_name?.split(',').slice(0, 3).join(',') });
          setShowLocationModal(false);
          setLocationModalData({ address: '', city: '', state: '', pincode: '', isGeocoding: false });
          return;
        }
      }
      setGeoError('Could not find this location. Please check your address details and try again.');
    } catch {
      setGeoError('Failed to verify address. Please check your internet connection and try again.');
    } finally {
      setLocationModalData(prev => ({ ...prev, isGeocoding: false }));
    }
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
    } else if (!/^\d{10}$/.test(formData.contact_number.replace(/\D/g, ''))) {
      newErrors.contact_number = 'Contact number must be exactly 10 digits';
    }

    if (!formData.business_type) {
      newErrors.business_type = 'Please select a business type';
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
      newErrors.location = 'Store location is required. Use GPS or fill in your address and click "Use Address Location".';
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
      setTouched({ store_name: true, contact_person: true, contact_number: true, business_type: true });
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setTouched(prev => ({ ...prev, address: true, city: true, state: true, pincode: true }));
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
          business_type: formData.business_type,
          latitude: formData.latitude,
          longitude: formData.longitude,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create store');
      }

      await response.json();
      // Hard navigate so the merchantHasStore cookie is picked up by middleware
      window.location.href = '/dashboard';
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

  // Show loading state while checking for existing stores
  if (currentStep === null || isCheckingStores) {
    return (
      <div className={styles.pageShell}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #ef9e1b',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#637080', fontSize: '14px' }}>Loading...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen if user has no existing stores
  if (currentStep === 0) {
    return (
      <div className={styles.pageShell}>
        <StoreWelcomeScreen onGetStarted={() => setCurrentStep(1)} />
      </div>
    );
  }

  return (
    <div className={styles.pageShell}>
      <div className={styles.topBar}>
        <img src="/horizontal_logo.svg" alt="ScratchX" className={styles.topLogo} />
      </div>
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
      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form} ref={formRef}>

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
                <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.store_name}</span>
              )}
            </div>

            {/* Business Type */}
            <div className={styles.formGroup}>
              <label htmlFor="business_type" className={styles.label}>
                Business Type <span className={styles.required}>*</span>
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="business_type"
                  name="business_type"
                  value={formData.business_type}
                  onChange={(e) => {
                    handleChange(e);
                    setErrors(prev => ({ ...prev, business_type: undefined }));
                  }}
                  onBlur={() => handleFieldBlur('business_type')}
                  className={`${styles.select} ${!formData.business_type ? styles.selectPlaceholder : ''}`}
                  disabled={submitting}
                >
                  <option value="">Select Business Type</option>
                  <option value="grocery_kirana">Grocery &amp; Kirana Stores</option>
                  <option value="jewellery_luxury">Jewellery &amp; Luxury</option>
                  <option value="electronics_gadgets">Electronics &amp; Gadgets</option>
                  <option value="fashion_apparel">Fashion &amp; Apparel</option>
                  <option value="bakeries_sweets">Bakeries &amp; Sweet Shops</option>
                  <option value="quick_service">Quick Service (QSR)</option>
                  <option value="salon_beauty">Salon &amp; Beauty</option>
                  <option value="fitness_gyms">Fitness &amp; Gyms</option>
                  <option value="supermarket">Supermarkets / Hypermarkets</option>
                  <option value="pharmacy_medical">Pharmacy / Medical</option>
                  <option value="home_lifestyle">Home &amp; Lifestyle</option>
                  <option value="other">Other</option>
                </select>
                <svg className={styles.selectChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              {touched.business_type && errors.business_type && (
                <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.business_type}</span>
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
                <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.contact_person}</span>
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
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleChange({ target: { name: 'contact_number', value: digitsOnly } });
                }}
                onBlur={() => handleFieldBlur('contact_number')}
                placeholder="E.g. 9876543210"
                className={styles.input}
                maxLength={10}
                inputMode="numeric"
                required
                disabled={submitting}
              />
              {touched.contact_number && errors.contact_number && (
                <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.contact_number}</span>
              )}
            </div>

            {/* Step 1 Navigation */}
            <div className={styles.buttonRow}>
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
                    {(locationInfo?.area || locationInfo?.city) ? (
                      <p className={styles.locationArea}>
                        {[locationInfo.area, locationInfo.city, locationInfo.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    ) : locationInfo?.display ? (
                      <p className={styles.locationArea}>{locationInfo.display}</p>
                    ) : (
                      <p className={styles.locationArea}>Location detected</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.retakeBtn}
                    onClick={requestGeolocation}
                    disabled={submitting}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Retake
                  </button>
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

              {locationStatus === 'denied' && !formData.latitude && !showLocationModal && (
                <div className={styles.locationErrorBox}>
                  <div className={styles.errorIcon}>📍</div>
                  <p className={styles.errorText}>
                    We couldn't access your location, but no worries! You can enter your store address manually below.
                  </p>
                  <button
                    type="button"
                    className={styles.useCurrentButton}
                    onClick={() => {
                      setShowLocationModal(true);
                      setLocationModalData(prev => ({
                        ...prev,
                        address: formData.address,
                        city: formData.city,
                        state: formData.state,
                        pincode: formData.pincode,
                      }));
                    }}
                    disabled={submitting}
                  >
                    Enter Address Manually
                  </button>
                </div>
              )}
            </div>

            {/* Location Permission Modal - Manual Address Entry */}
            {showLocationModal && locationStatus === 'denied' && (
              <div className={styles.modalOverlay} onClick={() => !locationModalData.isGeocoding && setShowLocationModal(false)}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Enter Your Store Address</h2>
                  </div>
                  <div className={styles.modalBody}>
                    {geoError && locationStatus === 'denied' && (
                      <div className={styles.modalError}>
                        <span className={styles.errorIcon}>⚠️</span>
                        {geoError}
                      </div>
                    )}

                    {/* Address field */}
                    <div className={styles.modalFormGroup}>
                      <label className={styles.modalLabel}>Address <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        placeholder="E.g. 123 Main Street, Suite 100"
                        value={locationModalData.address}
                        onChange={(e) => setLocationModalData(prev => ({ ...prev, address: e.target.value }))}
                        className={styles.modalInput}
                        disabled={locationModalData.isGeocoding}
                      />
                    </div>

                    {/* City and State row */}
                    <div className={styles.modalTwoColumn}>
                      <div className={styles.modalFormGroup}>
                        <label className={styles.modalLabel}>City <span className={styles.required}>*</span></label>
                        <input
                          type="text"
                          placeholder="E.g. New York"
                          value={locationModalData.city}
                          onChange={(e) => setLocationModalData(prev => ({ ...prev, city: e.target.value }))}
                          className={styles.modalInput}
                          disabled={locationModalData.isGeocoding}
                        />
                      </div>
                      <div className={styles.modalFormGroup}>
                        <label className={styles.modalLabel}>State <span className={styles.required}>*</span></label>
                        <input
                          type="text"
                          placeholder="E.g. NY"
                          value={locationModalData.state}
                          onChange={(e) => setLocationModalData(prev => ({ ...prev, state: e.target.value }))}
                          className={styles.modalInput}
                          disabled={locationModalData.isGeocoding}
                        />
                      </div>
                    </div>

                    {/* Pincode field */}
                    <div className={styles.modalFormGroup}>
                      <label className={styles.modalLabel}>Pincode <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        placeholder="E.g. 100001"
                        value={locationModalData.pincode}
                        onChange={(e) => setLocationModalData(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        className={styles.modalInput}
                        maxLength="6"
                        disabled={locationModalData.isGeocoding}
                      />
                    </div>
                  </div>
                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={styles.modalCancelButton}
                      onClick={() => {
                        setShowLocationModal(false);
                        setLocationModalData({ address: '', city: '', state: '', pincode: '', isGeocoding: false });
                      }}
                      disabled={locationModalData.isGeocoding}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.modalButton}
                      onClick={handleModalGeocodeAddress}
                      disabled={locationModalData.isGeocoding}
                    >
                      {locationModalData.isGeocoding ? 'Verifying...' : 'OK'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.address}</span>
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
                  <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.city}</span>
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
                  <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.state}</span>
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
                <span className={styles.errorText} data-error="true"><AlertCircle size={12} />{errors.pincode}</span>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleNextStep}
                disabled={submitting}
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
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
                {formData.business_type && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Business Type:</span>
                    <span style={{ textTransform: 'capitalize' }}>{formData.business_type}</span>
                  </div>
                )}
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
                {(locationInfo?.area || locationInfo?.city) && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Location:</span>
                    <span>
                      {[locationInfo.area, locationInfo.city, locationInfo.state]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : (
                  <>
                    Save Store
                    
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
    </div>
  );
}
