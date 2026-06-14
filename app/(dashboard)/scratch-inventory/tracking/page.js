'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import InventoryTracking from '@/components/inventory/InventoryTracking';
import styles from './page.module.css';

export default function TrackingPage() {
  const { account } = useAuthContext();
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTracking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!account?.id) {
        setError('No account information available');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': account.id,
        'x-user-role': account.role
      };

      const response = await fetch('/api/inventory/tracking', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }
      const data = await response.json();
      setTrackingData(data);
    } catch (err) {
      setError(err.message || 'Failed to load tracking data');
      console.error('Error fetching tracking data:', err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account && account.id) {
      fetchTracking();
    }
  }, [account, fetchTracking]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => window.history.back()}
          className={styles.backButton}
        >
          ← Back
        </button>
        <div className={styles.titleSection}>
          <h1>Inventory Movement History</h1>
          <p>Track all scratch allocations, transfers, and redemptions</p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.trackingCard}>
        <InventoryTracking
          trackingData={trackingData}
          loading={loading}
        />
      </div>
    </div>
  );
}
