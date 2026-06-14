'use client';
import React from 'react';
import styles from './ScratchConsumptionChart.module.css';

/**
 * ScratchConsumptionChart Component
 * Displays a bar chart showing scratch card consumption over time
 * Used in Merchant Dashboard to visualize usage patterns
 */
export default function ScratchConsumptionChart() {
  // Mock data for chart - replace with actual data from API
  const chartData = [
    { day: 'Mon', allocated: 400, used: 240 },
    { day: 'Tue', allocated: 300, used: 180 },
    { day: 'Wed', allocated: 450, used: 320 },
    { day: 'Thu', allocated: 350, used: 220 },
    { day: 'Fri', allocated: 500, used: 410 },
    { day: 'Sat', allocated: 280, used: 190 },
    { day: 'Sun', allocated: 200, used: 120 },
  ];

  const maxValue = Math.max(...chartData.flatMap(d => [d.allocated, d.used]));

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chart}>
        <div className={styles.yAxis}>
          <span>{Math.round(maxValue)}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>0</span>
        </div>
        <div className={styles.barsArea}>
          {chartData.map((item, index) => (
            <div key={index} className={styles.barCol}>
              <div className={styles.barStack}>
                <div
                  className={styles.barAllocated}
                  style={{
                    height: `${(item.allocated / maxValue) * 100}%`,
                  }}
                  title={`Allocated: ${item.allocated}`}
                ></div>
                <div
                  className={styles.barUsed}
                  style={{
                    height: `${(item.used / maxValue) * 100}%`,
                  }}
                  title={`Used: ${item.used}`}
                ></div>
              </div>
              <span className={styles.dayLabel}>{item.day}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotAllocated}`}></span>
          <span>Allocated</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.dotUsed}`}></span>
          <span>Used</span>
        </div>
      </div>
    </div>
  );
}
