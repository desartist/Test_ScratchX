'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import styles from './CampaignStoresTable.module.css';

export default function CampaignStoresTable({
  stores,
  loading,
  onRemoveClick
}) {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        Loading assigned stores...
      </div>
    );
  }
  console.log(stores, "stores")
  if (!stores || stores.length === 0) {
    return (
      <div className={styles.emptyState}>
        No stores assigned to this campaign yet
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Store Name</th>
            <th>Store Code</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {stores.map(store => (
            <tr key={store.storeId}>
              <td className={styles.nameCell}>
                {store.storeName || 'N/A'}
              </td>
              <td className={styles.codeCell}>
                {store.storeCode || '-'}
              </td>
              <td className={styles.statusCell}>
                <span className={`${styles.statusBadge} ${styles[`status-${store.status}` || 'status-active']}`}>
                  {store.status === 'active' ? 'Active' : 'Removed'}
                </span>
              </td>
              <td className={styles.actionCell}>
                <button
                  className={styles.removeButton}
                  onClick={() => onRemoveClick(store.storeId)}
                  title="Remove store"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
