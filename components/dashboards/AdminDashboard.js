'use client';

import React from 'react';
import StatCard from './shared/StatCard';
import UserTable from './shared/UserTable';
import styles from './Dashboard.module.css';

export default function AdminDashboard({ data: propData }) {
  // Use data from parent prop
  const data = propData || null;

  if (!data) {
    return <div className={styles.empty}>Dashboard data unavailable</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.statsGrid}>
        <StatCard label="Total Merchants" value={data.merchantCount} color="primary" />
        <StatCard label="Active Merchants" value={data.activeMerchants} color="success" />
        <StatCard label="Pending Setup" value={data.pendingMerchants} color="warning" />
        <StatCard label="Commission Rate" value={`${data.commissionRate}%`} color="primary" />
      </div>

      <UserTable
        title="Your Merchants"
        users={data.merchants}
        columns={['Email', 'Name', 'Role', 'Status']}
      />
    </div>
  );
}
