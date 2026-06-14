import React from 'react';
import styles from './page.module.css';

export default function AnalyticsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>Track your campaigns, scans, and customer insights</p>
      </div>

      {/* KPI skeletons */}
      <div className={styles.kpiGrid}>
        {['Total Scans', 'Redemptions', 'Customers', 'Conversion Rate'].map((label) => (
          <div key={label} className={styles.kpiCard}>
            <div className={styles.kpiIcon} />
            <div className={styles.kpiValue} />
            <div className={styles.kpiLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitle}>Scans Over Time</div>
            <div className={styles.chartBadge}>Coming Soon</div>
          </div>
          <div className={styles.chartBody}>
            <div className={styles.chartBars}>
              {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 65].map((h, i) => (
                <div key={i} className={styles.bar} style={{ '--h': `${h}%` }} />
              ))}
            </div>
            <div className={styles.chartOverlay}>
              <div className={styles.comingSoonIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <p className={styles.comingSoonText}>Analytics charts coming soon</p>
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitle}>Top Campaigns</div>
            <div className={styles.chartBadge}>Coming Soon</div>
          </div>
          <div className={styles.listBody}>
            {[85, 60, 45, 30, 20].map((w, i) => (
              <div key={i} className={styles.listRow}>
                <div className={styles.listDot} />
                <div className={styles.listBar} style={{ '--w': `${w}%` }} />
              </div>
            ))}
            <div className={styles.chartOverlay}>
              <div className={styles.comingSoonIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <p className={styles.comingSoonText}>Campaign breakdown coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom notice */}
      <div className={styles.notice}>
        <div className={styles.noticeIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className={styles.noticeText}>
          Detailed analytics will be available once your campaigns start collecting scan data.
          Run your first campaign to unlock insights.
        </p>
      </div>
    </div>
  );
}
