'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Check } from 'lucide-react';
import styles from '../retailers.module.css';

export default function CreateRetailerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    contactPersonName: '',
    contactPersonPhone: '',
    businessType: 'retail',
  });

  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.storeName.trim()) {
      errors.storeName = 'Store name is required';
    }
    if (!formData.ownerName.trim()) {
      errors.ownerName = 'Owner name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }
    if (!formData.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(formData.pincode)) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/distributor/retailers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to create retailer');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/retailers');
      }, 1500);
    } catch (err) {
      console.error('[CreateRetailer] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <Check size={48} />
            </div>
            <h2>Retailer Created Successfully!</h2>
            <p>Redirecting to retailers list...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.formHeader}>
          <button
            onClick={() => router.back()}
            className={styles.backButton}
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.headerContent}>
            <h1>Add New Retailer</h1>
            <p>Create a new retailer account and start assigning plans</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={styles.alertBox}>
            <AlertCircle size={20} />
            <div>
              <p className={styles.alertTitle}>Error</p>
              <p className={styles.alertMessage}>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className={styles.closeAlert}
            >
              ×
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Information */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>

            <div className={styles.formGroup}>
              <label htmlFor="storeName" className={styles.formLabel}>
                Store Name *
              </label>
              <input
                type="text"
                id="storeName"
                name="storeName"
                value={formData.storeName}
                onChange={handleInputChange}
                className={`${styles.formInput} ${
                  formErrors.storeName ? styles.inputError : ''
                }`}
                placeholder="Enter store name"
                disabled={loading}
              />
              {formErrors.storeName && (
                <span className={styles.errorText}>{formErrors.storeName}</span>
              )}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="ownerName" className={styles.formLabel}>
                  Owner Name *
                </label>
                <input
                  type="text"
                  id="ownerName"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${
                    formErrors.ownerName ? styles.inputError : ''
                  }`}
                  placeholder="Enter owner name"
                  disabled={loading}
                />
                {formErrors.ownerName && (
                  <span className={styles.errorText}>{formErrors.ownerName}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="businessType" className={styles.formLabel}>
                  Business Type
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                  disabled={loading}
                >
                  <option value="retail">Retail Store</option>
                  <option value="online">Online Store</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="franchise">Franchise</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Contact Information</h3>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${
                    formErrors.email ? styles.inputError : ''
                  }`}
                  placeholder="Enter email address"
                  disabled={loading}
                />
                {formErrors.email && (
                  <span className={styles.errorText}>{formErrors.email}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.formLabel}>
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${
                    formErrors.phone ? styles.inputError : ''
                  }`}
                  placeholder="Enter 10-digit phone number"
                  disabled={loading}
                />
                {formErrors.phone && (
                  <span className={styles.errorText}>{formErrors.phone}</span>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="contactPersonName" className={styles.formLabel}>
                  Contact Person Name
                </label>
                <input
                  type="text"
                  id="contactPersonName"
                  name="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="Enter contact person name"
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contactPersonPhone" className={styles.formLabel}>
                  Contact Person Phone
                </label>
                <input
                  type="tel"
                  id="contactPersonPhone"
                  name="contactPersonPhone"
                  value={formData.contactPersonPhone}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="Enter contact person phone"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Address Information</h3>

            <div className={styles.formGroup}>
              <label htmlFor="address" className={styles.formLabel}>
                Address *
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={`${styles.formTextarea} ${
                  formErrors.address ? styles.inputError : ''
                }`}
                placeholder="Enter full address"
                rows={3}
                disabled={loading}
              />
              {formErrors.address && (
                <span className={styles.errorText}>{formErrors.address}</span>
              )}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="city" className={styles.formLabel}>
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${
                    formErrors.city ? styles.inputError : ''
                  }`}
                  placeholder="Enter city"
                  disabled={loading}
                />
                {formErrors.city && (
                  <span className={styles.errorText}>{formErrors.city}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="state" className={styles.formLabel}>
                  State *
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${
                    formErrors.state ? styles.inputError : ''
                  }`}
                  placeholder="Enter state"
                  disabled={loading}
                />
                {formErrors.state && (
                  <span className={styles.errorText}>{formErrors.state}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="pincode" className={styles.formLabel}>
                  Pincode *
                </label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${
                    formErrors.pincode ? styles.inputError : ''
                  }`}
                  placeholder="Enter 6-digit pincode"
                  disabled={loading}
                />
                {formErrors.pincode && (
                  <span className={styles.errorText}>{formErrors.pincode}</span>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => router.back()}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Retailer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
