'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { criticalFetchService } from '@/lib/criticalFetchService';
import DataTable from '@/components/common/DataTable';
import styles from './page.module.css';

export default function ScratchInventoryPage() {
  const { account } = useAuthContext();
  const router = useRouter();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [stats, setStats] = useState({
    totalCards: 0,
    allocatedCards: 0,
    redeemedCards: 0,
    availableCards: 0
  });
  const [locations, setLocations] = useState([]);

  const fetchInventory = useCallback(async () => {
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

      const result = await criticalFetchService.fetchCriticalFirst(
        'scratch-inventory',
        [
          {
            key: 'inventory',
            url: '/api/inventory',
            options: { headers },
          },
        ],
        []
      );

      const inventoryData = result.critical?.inventory;
      if (!inventoryData) {
        throw new Error('Failed to fetch inventory');
      }
      setInventory(inventoryData);

      // Calculate stats
      const total = inventoryData.reduce((sum, item) => sum + item.totalQuantity, 0);
      const allocated = inventoryData.reduce((sum, item) => sum + (item.allocatedQuantity || 0), 0);
      const redeemed = inventoryData.reduce((sum, item) => sum + (item.redeemedQuantity || 0), 0);
      const available = total - allocated - redeemed;

      setStats({
        totalCards: total,
        allocatedCards: allocated,
        redeemedCards: redeemed,
        availableCards: available
      });

      // Extract unique locations
      const uniqueLocations = [...new Set(inventoryData.map(item => item.location))]
        .map(loc => ({ _id: loc, name: loc }));
      setLocations(uniqueLocations);
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory');
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account && account.id) {
      fetchInventory();
    }
  }, [account, fetchInventory]);

  const filteredInventory = selectedLocation === 'all'
    ? inventory
    : inventory.filter(item => item.location === selectedLocation);

  const columns = [
    { field: 'campaignName', label: 'Campaign' },
    { field: 'location', label: 'Location' },
    { field: 'totalQuantity', label: 'Total Cards' },
    {
      field: 'allocatedQuantity',
      label: 'Allocated',
      render: (val) => val || 0
    },
    {
      field: 'redeemedQuantity',
      label: 'Redeemed',
      render: (val) => val || 0
    },
    {
      field: 'availableQuantity',
      label: 'Available',
      render: (_, row) => {
        const available = row.totalQuantity - (row.allocatedQuantity || 0) - (row.redeemedQuantity || 0);
        return available;
      }
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Scratch Inventory</h1>
          <p>Manage and track scratch allocation across locations</p>
        </div>
        <button
          onClick={() => router.push('/scratch-inventory/allocate')}
          className={styles.actionButton}
        >
          + Allocate Cards
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Cards</span>
          <span className={styles.statValue}>{stats.totalCards.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Allocated</span>
          <span className={styles.statValue}>{stats.allocatedCards.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Redeemed</span>
          <span className={styles.statValue}>{stats.redeemedCards.toLocaleString()}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Available</span>
          <span className={styles.statValue}>{stats.availableCards.toLocaleString()}</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className={styles.inventoryTable}>
        <div className={styles.locationFilter}>
          <label className={styles.filterLabel}>Filter by Location:</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Locations</option>
            {locations.map(location => (
              <option key={location._id} value={location._id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <p>No inventory data available</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredInventory}
            loading={loading}
          />
        )}

        {!loading && inventory.length > 0 && (
          <div className={styles.trackingButtonContainer}>
            <button
              onClick={() => router.push('/scratch-inventory/tracking')}
              className={styles.trackingButton}
            >
              View Movement History →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
