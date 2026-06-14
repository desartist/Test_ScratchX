'use client'
import React from 'react'
import styles from './QuickStatsBar.module.css'

export default function QuickStatsBar({ stats }) {
  if (!stats || stats.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      {stats.map((stat, index) => (
        <div key={index} className={styles.statWrapper}>
          <div className={styles.stat}>
            <p className={styles.label}>{stat.label}</p>
            <p className={styles.value}>{stat.value}</p>
          </div>
          {index < stats.length - 1 && <div className={styles.divider} />}
        </div>
      ))}
    </div>
  )
}
