'use client';

import React from 'react';
import { Check, Clock } from 'lucide-react';
import styles from './StudioRoadmap.module.css';

export default function StudioRoadmap() {
  const roadmapItems = [
    {
      label: 'Campaign Management',
      status: 'completed',
      icon: <Check size={18} />,
    },
    {
      label: 'Store Management',
      status: 'completed',
      icon: <Check size={18} />,
    },
    {
      label: 'Customer Participation',
      status: 'completed',
      icon: <Check size={18} />,
    },
    {
      label: 'ScratchX Studio',
      status: 'in-progress',
      icon: <Clock size={18} />,
    },
    {
      label: 'AI Campaign Assistant',
      status: 'in-progress',
      icon: <Clock size={18} />,
    },
  ];

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>What's Coming Next</h2>
      <p className={styles.subtitle}>
        We're building powerful tools to help you create amazing customer experiences
      </p>

      <div className={styles.roadmap}>
        {roadmapItems.map((item, index) => (
          <div
            key={index}
            className={`${styles.item} ${styles[item.status]}`}
          >
            <div className={styles.itemIcon}>{item.icon}</div>
            <div className={styles.itemContent}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemStatus}>
                {item.status === 'completed' ? 'Completed' : 'In Progress'}
              </span>
            </div>
            {index < roadmapItems.length - 1 && (
              <div className={styles.connector}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
