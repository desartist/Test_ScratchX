'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';
import Link from 'next/link';
import styles from './EditCampaign.module.css';

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();
  const id = params.id;

  const [formData, setFormData] = useState({
    campaignName: '',
    description: '',
    startDate: '',
    endDate: '',
    rewardType: '',
    rewardValue: '',
    rewardUnit: '',
    distributionMethod: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch campaign on load
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!account || !account.id) {
          setError('No account information available');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/campaigns/${id}`, {
          headers: {
            'x-user-id': account.id,
            'x-user-role': account.role,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load campaign');
        }

        const data = await response.json();

        // Pre-fill form with campaign data
        setFormData({
          campaignName: data.data.campaignName || '',
          description: data.data.description || '',
          startDate: data.data.startDate ? data.data.startDate.split('T')[0] : '',
          endDate: data.data.endDate ? data.data.endDate.split('T')[0] : '',
          rewardType: data.data.rewardType || '',
          rewardValue: data.data.rewardValue || '',
          rewardUnit: data.data.rewardUnit || '',
          distributionMethod: data.data.distributionMethod || '',
        });
      } catch (err) {
        setError(err.message || 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    if (id && account) {
      fetchCampaign();
    }
  }, [id, account]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': account.id,
          'x-user-role': account.role,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update campaign');
      }

      setSuccessMessage('Campaign updated successfully!');

      // Redirect to campaign detail page
      setTimeout(() => {
        router.push(`/campaign/${id}`);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading campaign...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/campaign`} className={styles.backBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className={styles.title}>Edit Campaign</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Campaign Name</label>
          <input
            type="text"
            name="campaignName"
            value={formData.campaignName}
            onChange={handleChange}
            className={styles.input}
            placeholder="e.g. Summer Hot Offers"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Campaign description"
            rows="3"
          />
        </div>

        <div className={styles.dateRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
        </div>

        {/* <div className={styles.formGroup}>
          <label className={styles.label}>Reward Type</label>
          <input
            type="text"
            name="rewardType"
            value={formData.rewardType}
            onChange={handleChange}
            className={styles.input}
            placeholder="e.g. Discount, Gift Card"
          />
        </div>

        <div className={styles.rewardRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Reward Value</label>
            <input
              type="number"
              name="rewardValue"
              value={formData.rewardValue}
              onChange={handleChange}
              className={styles.input}
              placeholder="e.g. 100"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Reward Unit</label>
            <input
              type="text"
              name="rewardUnit"
              value={formData.rewardUnit}
              onChange={handleChange}
              className={styles.input}
              placeholder="e.g. INR, %"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Distribution Method</label>
          <input
            type="text"
            name="distributionMethod"
            value={formData.distributionMethod}
            onChange={handleChange}
            className={styles.input}
            placeholder="e.g. QR Code, Email"
          />
        </div> */}

        {error && <div className={styles.error}>{error}</div>}
        {successMessage && <div className={styles.success}>{successMessage}</div>}

        <div className={styles.stickyFooter}>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
