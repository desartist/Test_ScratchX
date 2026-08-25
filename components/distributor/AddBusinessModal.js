'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Eye, EyeOff, ChevronDown, Store, Warehouse, Check } from 'lucide-react';
import { useCreateMerchantMutation } from '@/hooks/queries/useDistributorMerchantsQuery';
import { sanitizeNameInput } from '@/lib/nameInput';
// Reuses the Businesses page's stylesheet so the modal is pixel-identical
// wherever it's opened from (Businesses page, distributor dashboard, etc.).
import styles from '@/app/(dashboard)/retailers/retailers.module.css';

const EMPTY_FORM = {
  storeName: '',
  name: '',
  countryCode: '+91',
  phoneNumber: '',
  email: '',
  planType: '',
  password: '',
  businessModel: 'Retail',
};

const BUSINESS_MODELS = [
  {
    value: 'Retail',
    label: 'Retailer',
    icon: Store,
    description: 'Sells directly to end customers',
  },
  {
    value: 'Wholesale',
    label: 'Wholesaler',
    icon: Warehouse,
    description: 'Sells in bulk to retailers or dealers',
  },
];

function CustomSelect({ id, options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={styles.customSelect} ref={ref}>
      <button
        type="button"
        id={id}
        className={`${styles.customSelectTrigger} ${open ? styles.customSelectTriggerOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected?.value ? styles.customSelectValue : styles.customSelectPlaceholder}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={open ? styles.customSelectChevronOpen : styles.customSelectChevron}
        />
      </button>
      {open && (
        <ul className={styles.customSelectList} role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={[
                styles.customSelectOption,
                opt.disabled ? styles.customSelectOptionDisabled : '',
                opt.value === value ? styles.customSelectOptionSelected : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Add New Business modal — shared between the Businesses page and the
 * distributor dashboard's "Start Onboarding" button so both open the exact
 * same form in place, instead of navigating away.
 */
export default function AddBusinessModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [inventory, setInventory] = useState(null);

  const createMutation = useCreateMerchantMutation();

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/distributor/inventory', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setInventory(json.data);
      })
      .catch(() => {});
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectBusinessModel = (value) => {
    setFormData((prev) => ({ ...prev, businessModel: value }));
  };

  const handleClose = () => {
    onClose();
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Name, email and password are required');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      handleClose();
      onCreated?.();
    } catch (err) {
      setFormError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Add New Business</h2>
          </div>
          <button className={styles.modalClose} onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {formError && (
            <div className={styles.formError}>
              <AlertCircle size={16} />
              {formError}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Business Model *</label>
            <div className={styles.businessTypeGrid}>
              {BUSINESS_MODELS.map((type) => {
                const Icon = type.icon;
                const selected = formData.businessModel === type.value;
                return (
                  <button
                    type="button"
                    key={type.value}
                    className={`${styles.businessTypeCard} ${selected ? styles.businessTypeCardActive : ''}`}
                    onClick={() => handleSelectBusinessModel(type.value)}
                  >
                    {selected && (
                      <span className={styles.businessTypeCheck}>
                        <Check size={12} />
                      </span>
                    )}
                    <span className={styles.businessTypeIcon}>
                      <Icon size={20} />
                    </span>
                    <span className={styles.businessTypeLabel}>{type.label}</span>
                    <span className={styles.businessTypeDescription}>{type.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="storeName" className={styles.formLabel}>
              Business Name *
            </label>
            <input
              type="text"
              id="storeName"
              name="storeName"
              value={formData.storeName}
              onChange={handleInputChange}
              placeholder="Enter business name"
              className={styles.formInput}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Owner Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => handleInputChange({ target: { name: 'name', value: sanitizeNameInput(e.target.value) } })}
              placeholder="Enter owner's full name"
              className={styles.formInput}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phoneNumber" className={styles.formLabel}>
              Contact Number *
            </label>
            <div className={styles.phoneInputWrapper}>
              <select
                name="countryCode"
                value={formData.countryCode}
                onChange={handleInputChange}
                className={styles.countryCodeSelect}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+971">+971</option>
              </select>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                className={styles.formInput}
                inputMode="numeric"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email ID *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              className={styles.formInput}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="planType" className={styles.formLabel}>
              Choose Subscription
            </label>
            <CustomSelect
              id="planType"
              value={formData.planType}
              onChange={(val) => setFormData((prev) => ({ ...prev, planType: val }))}
              placeholder="Select licence (optional)"
              options={[
                {
                  value: 'SMART',
                  label: `Smart Licence${inventory ? ` (${inventory.plans?.SMART?.totalRemaining || 0} left)` : ''}`,
                  disabled: !inventory?.plans?.SMART?.totalRemaining,
                },
                {
                  value: 'CORE',
                  label: `Core Licence${inventory ? ` (${inventory.plans?.CORE?.totalRemaining || 0} left)` : ''}`,
                  disabled: !inventory?.plans?.CORE?.totalRemaining,
                },
              ]}
            />
            <p className={styles.formHint}>
              Assigns a license from your purchased inventory and activates it immediately.
              Leave blank to add the retailer without a plan.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password *
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password (min 6 characters)"
                className={styles.formInput}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={createMutation.isPending}>
              {createMutation.isPending
                ? 'Activating...'
                : `Activate ${formData.businessModel === 'Wholesale' ? 'Wholesaler' : 'Retailer'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
