'use client';

import React, { useState, useEffect } from 'react';
import StatCard from './shared/StatCard';
import UserTable from './shared/UserTable';
import DashboardLoading from './shared/DashboardLoading';
import styles from './Dashboard.module.css';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/super-admin', {
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
      <div className={styles.statsGridSix}>
        <StatCard label="Total Users" value={data.totalUsers} color="primary" />
        <StatCard label="Active Users" value={data.activeUsers} color="success" />
        <StatCard label="Pending Verification" value={data.pendingUsers} color="warning" />
        <StatCard label="Distributors" value={data.roleCounts.distributors} color="primary" />
        <StatCard label="Merchants" value={data.roleCounts.merchants} color="primary" />
        <StatCard label="Managers" value={data.roleCounts.managers} color="primary" />
      </div>

      <UserTable
        title="Recent Registrations"
        users={data.recentUsers}
        columns={['Email', 'Name', 'Role', 'Status']}
      />
    </div>
  );
}
