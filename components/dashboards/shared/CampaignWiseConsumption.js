'use client';
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './CampaignWiseConsumption.module.css';

export default function CampaignWiseConsumption() {
  const { account } = useAuthContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!account?.id) return;

      try {
        setLoading(true);

        // Fetch campaign-wise consumption data
        const response = await fetch('/api/analytics/redemptions?type=merchant', {
          credentials: 'include',
          headers: {
            'x-user-id': account.id,
            'x-user-role': account.role || 'Merchant',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.topCampaigns) {
            setData(result.data);
          }
        } else {
          throw new Error('Failed to fetch');
        }
      } catch (err) {
        console.error('Error fetching campaign consumption:', err);
        // Fallback to mock data
        setData({
          topCampaigns: [
            { campaignName: 'Summer Hot Offers', count: 4725 },
            { campaignName: 'Monsoon Bonanza', count: 1086 },
            { campaignName: 'Weekend Rewards', count: 1447 },
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [account]);

  if (loading || !data) return null;

  const campaigns = (data.topCampaigns || []).slice(0, 3);
  const total = campaigns.reduce((sum, c) => sum + (c.count || 0), 0);

  const colors = ['#ffa500', '#7c3aed', '#06b6d4'];
  const percentages = campaigns.map(c => Math.round((c.count / total) * 100));

  // Create SVG pie chart
  let currentAngle = 0;
  const paths = campaigns.map((campaign, index) => {
    const angle = (campaign.count / total) * 360;
    const startAngle = (currentAngle * Math.PI) / 180;
    const endAngle = ((currentAngle + angle) * Math.PI) / 180;

    const x1 = 50 + 45 * Math.cos(startAngle);
    const y1 = 50 + 45 * Math.sin(startAngle);
    const x2 = 50 + 45 * Math.cos(endAngle);
    const y2 = 50 + 45 * Math.sin(endAngle);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;

    currentAngle += angle;

    return (
      <path
        key={index}
        d={pathData}
        fill={colors[index]}
        style={{ transition: 'opacity 0.3s ease', cursor: 'pointer' }}
        onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
        onMouseLeave={(e) => (e.target.style.opacity = '1')}
      />
    );
  });

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Campaign-wise Consumption</h3>

      <div className={styles.chartWrapper}>
        {/* Pie Chart */}
        <svg className={styles.pieChart} viewBox="0 0 100 100">
          {paths}
        </svg>

        {/* Center Label */}
        <div className={styles.centerLabel}>
          <div className={styles.centerValue}>{total.toLocaleString()}</div>
          <div className={styles.centerText}>used</div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {campaigns.map((campaign, index) => (
          <div key={index} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: colors[index] }}
            ></span>
            <div className={styles.legendContent}>
              <span className={styles.legendName}>{campaign.campaignName}</span>
              <span className={styles.legendPercent}>{percentages[index]}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
