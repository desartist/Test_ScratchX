'use client'
import React from 'react'
import styles from './CampaignStatCard.module.css'

export default function CampaignStatCard({
  label,
  value,
  icon = null,
  trend = null,
  trendDirection = null,
}) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.labelWrapper}>
          <p className={styles.label}>{label}</p>
        </div>
        {icon && (
          <div className={styles.iconWrapper}>
            {icon}
          </div>
        )}
      </div>

      <p className={styles.value}>{value}</p>

      {trend && (
        <div className={styles.trendContainer}>
          <p
            className={`${styles.trend} ${
              trendDirection === 'up'
                ? styles.trendUp
                : trendDirection === 'down'
                ? styles.trendDown
                : ''
            } ${
              trendDirection === 'up'
                ? styles.trendArrowUp
                : trendDirection === 'down'
                ? styles.trendArrowDown
                : ''
            }`}
          >
            {trend}
          </p>
        </div>
      )}
    </article>
  )
}
