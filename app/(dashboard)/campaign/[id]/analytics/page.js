'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthContext } from '@/components/auth/AuthContext';
import CampaignAnalyticsChart from '@/components/campaigns/CampaignAnalyticsChart';
import styles from './page.module.css';

export default function CampaignAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuthContext();
  const id = params.id;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Mock distribution data
  const distributionData = [
    { label: 'Week 1', value: 150 },
    { label: 'Week 2', value: 280 },
    { label: 'Week 3', value: 320 },
    { label: 'Week 4', value: 200 }
  ];

  // Mock redemption by location data
  const redemptionByLocation = [
    { label: 'Mumbai', value: 180 },
    { label: 'Delhi', value: 240 },
    { label: 'Bangalore', value: 160 },
    { label: 'Chennai', value: 130 },
    { label: 'Others', value: 90 }
  ];

  // Mock daily redemption trend
  const dailyRedemptionTrend = [
    { label: 'Day 1', value: 45 },
    { label: 'Day 2', value: 78 },
    { label: 'Day 3', value: 65 },
    { label: 'Day 4', value: 92 },
    { label: 'Day 5', value: 110 },
    { label: 'Day 6', value: 135 },
    { label: 'Day 7', value: 155 }
  ];

  // Fetch campaign
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!account || !account._id) {
          setError('No account information available');
          setCampaign(null);
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/campaigns/${id}`, {
          headers: {
            'x-user-id': account._id,
            'x-user-role': account.role
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load campaign');
        }

        const data = await response.json();
        setCampaign(data);
      } catch (err) {
        setError(err.message || 'Failed to load campaign');
        setCampaign(null);
      } finally {
        setLoading(false);
      }
    };

    if (id && account) {
      fetchCampaign();
    }
  }, [id, account]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading analytics...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <a href="/campaign" className={styles.backLink}>
          ← Back to Campaigns
        </a>
      </div>
    );
  }

  // Not found state
  if (!campaign) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>Campaign not found</div>
        <a href="/campaign" className={styles.backLink}>
          ← Back to Campaigns
        </a>
      </div>
    );
  }

  // Calculate metrics
  const totalDistributed = campaign.distributedQuantity || 0;
  const totalRedeemed = campaign.redeemedQuantity || 0;
  const redemptionRate =
    totalDistributed > 0 ? ((totalRedeemed / totalDistributed) * 100).toFixed(2) : 0;
  const revenueGenerated = (totalRedeemed * (campaign.rewardValue || 0)).toFixed(2);

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <a href="/campaign" className={styles.backLink}>
            ← Back to Campaigns
          </a>
          <h1>{campaign.name} - Analytics</h1>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <label htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className={styles.dateInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className={styles.dateInput}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Distributed</div>
          <div className={styles.kpiValue}>{totalDistributed}</div>
          <div className={styles.kpiSubtext}>Units distributed</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Redeemed</div>
          <div className={styles.kpiValue}>{totalRedeemed}</div>
          <div className={styles.kpiSubtext}>Units redeemed</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Redemption Rate</div>
          <div className={styles.kpiValue}>{redemptionRate}%</div>
          <div className={styles.kpiSubtext}>Percentage redeemed</div>
        </div>

        {campaign.rewardValue && (
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Revenue Generated</div>
            <div className={styles.kpiValue}>${revenueGenerated}</div>
            <div className={styles.kpiSubtext}>Total revenue</div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className={styles.chartsContainer}>
        <CampaignAnalyticsChart
          type="line"
          data={distributionData}
          title="Distribution Over Time"
          dataKey="value"
          labelKey="label"
          color="#2563eb"
        />

        <CampaignAnalyticsChart
          type="bar"
          data={redemptionByLocation}
          title="Redemption by Location"
          dataKey="value"
          labelKey="label"
          color="#10b981"
        />

        <CampaignAnalyticsChart
          type="area"
          data={dailyRedemptionTrend}
          title="Daily Redemption Trend"
          dataKey="value"
          labelKey="label"
          color="#f59e0b"
        />
      </div>

      {/* Back Link */}
      <div className={styles.footer}>
        <a href={`/campaigns/${id}`} className={styles.backLink}>
          ← Back to Campaign Details
        </a>
      </div>
    </div>
  );
}
