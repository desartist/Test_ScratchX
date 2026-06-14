'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import InventoryForm from '@/components/inventory/InventoryForm';
import styles from './page.module.css';

export default function AllocateInventoryPage() {
  const { account } = useAuthContext();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = useCallback(async () => {
    if (!account?.id) {
      setError('No account information available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account.id,
        'x-user-role': account.role
      };

      // Fetch campaigns
      const campaignRes = await fetch('/api/campaigns', { headers });
      if (!campaignRes.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      const campaignData = await campaignRes.json();
      setCampaigns(campaignData);

      // Fetch locations (stores)
      const locationRes = await fetch('/api/stores', { headers });
      if (!locationRes.ok) {
        throw new Error('Failed to fetch locations');
      }
      const locationData = await locationRes.json();
      setLocations(locationData);
    } catch (err) {
      setError(err.message || 'Failed to load allocation data');
      console.error('Error fetching allocation data:', err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account && account.id) {
      fetchData();
    }
  }, [account, fetchData]);

  const handleAllocate = useCallback(async (formData) => {
    try {
      setSubmitLoading(true);
      setError(null);
      setSuccessMessage('');

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account?.id,
        'x-user-role': account?.role
      };

      const response = await fetch('/api/inventory/allocate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignId: formData.campaignId,
          locationId: formData.locationId,
          quantity: formData.quantity
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to allocate cards');
      }

      setSuccessMessage('Cards allocated successfully!');

      // Redirect immediately (removed 2-second delay to prevent memory leaks)
      router.push('/scratch-inventory');
    } catch (err) {
      setError(err.message || 'Failed to allocate cards');
      console.error('Error allocating cards:', err);
    } finally {
      setSubmitLoading(false);
    }
  }, [account, router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => router.back()}
          className={styles.backButton}
        >
          ← Back
        </button>
        <div className={styles.titleSection}>
          <h1>Allocate Scratches</h1>
          <p>Distribute scratches from your inventory to stores and campaigns</p>
        </div>
      </div>

      <div className={styles.formCard}>
        {error && <div className={styles.error}>{error}</div>}
        {successMessage && <div className={styles.successMessage}>{successMessage}</div>}

        <InventoryForm
          campaigns={campaigns}
          locations={locations}
          onSubmit={handleAllocate}
          onCancel={() => router.back()}
          loading={submitLoading}
        />
      </div>
    </div>
  );
}
