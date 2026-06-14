'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import styles from './StudioFeatureCard.module.css';

export default function StudioFeatureCard({ icon, title, description }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.icon}>{icon}</div>
        <div className={styles.lockBadge}>
          <Lock size={14} />
        </div>
      </div>

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      <div className={styles.comingSoon}>Coming Soon</div>
    </div>
  );
}
