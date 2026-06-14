'use client';

import React, { useState, useEffect } from 'react';
import StatCard from './shared/StatCard';
import UserTable from './shared/UserTable';
import DashboardLoading from './shared/DashboardLoading';
import styles from './Dashboard.module.css';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/manager', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard');

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <DashboardLoading />;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!data) return <div className={styles.empty}>No data available</div>;

  return (
    <div className={styles.dashboard}>
      <div className={styles.infoBanner}>
        <h3>{data.managerName}</h3>
        <p>
          <strong>Store:</strong> {data.merchantName}
        </p>
      </div>

      <div className={styles.statsGridTwo}>
        <StatCard label="Staff Under Management" value={data.staffCount} color="primary" />
      </div>

      <UserTable
        title="Staff Members"
        users={data.staff}
        columns={['Email', 'Name', 'Role', 'Status']}
      />
    </div>
  );
}
