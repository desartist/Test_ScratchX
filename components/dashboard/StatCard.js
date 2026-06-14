"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./StatCard.module.css";

export default function StatCard({
  icon,
  label,
  value,
  unit = "",
  trend = null,
  highlight = false,
}) {
  return (
    <div className={`${styles.card} ${highlight ? styles.highlight : ""}`}>
      <div className={styles.header}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.label}>{label}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.valueContainer}>
          <span className={styles.value}>{value}</span>
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>

        {trend && (
          <div className={`${styles.trend} ${styles[trend.direction]}`}>
            <span className={styles.trendIcon}>
              {trend.direction === "up" ? "↑" : "↓"}
            </span>
            <span className={styles.trendValue}>{trend.percent}%</span>
          </div>
        )}
      </div>

      {highlight && <div className={styles.highlightBg}></div>}
    </div>
  );
}

StatCard.propTypes = {
  icon: PropTypes.string,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string,
  trend: PropTypes.shape({
    direction: PropTypes.oneOf(["up", "down"]),
    percent: PropTypes.number,
  }),
  highlight: PropTypes.bool,
};
