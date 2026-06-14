import React from 'react';
import styles from './page.module.css';

const MOCK_NOTIFICATIONS = [
  { id: 1, icon: '🎯', title: 'Campaign milestone reached', desc: 'Your campaign hits 100 scans once it goes live.', time: 'Just now', unread: true },
  { id: 2, icon: '🏪', title: 'Store verified', desc: 'Your store location has been confirmed.', time: '2 min ago', unread: true },
  { id: 3, icon: '🎟️', title: 'First scratch redeemed', desc: 'A customer redeemed a coupon from your campaign.', time: '1 hr ago', unread: false },
  { id: 4, icon: '📊', title: 'Weekly report ready', desc: 'Your campaign performance summary is ready.', time: 'Yesterday', unread: false },
  { id: 5, icon: '💡', title: 'Tip: Boost conversions', desc: 'Add a time limit to your campaign to drive urgency.', time: '2 days ago', unread: false },
];

export default function NotificationsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Stay updated on your campaigns and store activity</p>
        </div>
        <div className={styles.unreadBadge}>2 unread</div>
      </div>

      {/* Coming soon banner */}
      <div className={styles.comingSoonBanner}>
        <div className={styles.bannerIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div>
          <p className={styles.bannerTitle}>Real-time notifications coming soon</p>
          <p className={styles.bannerDesc}>You&apos;ll get alerts for campaign activity, redemptions, and store updates here.</p>
        </div>
      </div>

      {/* Mock notification list */}
      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Preview</span>
          <span className={styles.previewTag}>Sample</span>
        </div>

        <div className={styles.list}>
          {MOCK_NOTIFICATIONS.map((n) => (
            <div key={n.id} className={`${styles.item} ${n.unread ? styles.unread : ''}`}>
              <div className={styles.itemIcon}>{n.icon}</div>
              <div className={styles.itemBody}>
                <div className={styles.itemTitle}>{n.title}</div>
                <div className={styles.itemDesc}>{n.desc}</div>
              </div>
              <div className={styles.itemMeta}>
                <span className={styles.itemTime}>{n.time}</span>
                {n.unread && <span className={styles.dot} />}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.listFooter}>
          These are sample notifications. Real alerts will appear here once your campaigns are active.
        </div>
      </div>
    </div>
  );
}
