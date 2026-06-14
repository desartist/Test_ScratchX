"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./DonutChart.module.css";

const FALLBACK_COLORS = ["#6d5df6", "#4c6ef5", "#ef9e1b", "#00b0b1", "#b9b0f7"];

export default function DonutChart({
  segments = [],
  centerLabel,
  centerSubLabel,
  ariaLabel = "Donut chart",
}) {
  if (!segments || segments.length === 0) {
    return <div className={styles.empty}>No data yet</div>;
  }

  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);

  // Donut geometry.
  const SIZE = 160;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const radius = 60;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;

  // Precompute each arc's fraction + cumulative offset (no outer mutation).
  const arcs = segments.map((s, i) => {
    const value = s.value || 0;
    const fraction = total === 0 ? 0 : value / total;
    const dash = fraction * circumference;
    const priorFraction = segments
      .slice(0, i)
      .reduce((sum, prev) => sum + (total === 0 ? 0 : (prev.value || 0) / total), 0);
    return {
      color: s.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      label: s.label,
      value,
      pct: total === 0 ? 0 : Math.round(fraction * 1000) / 10,
      dasharray: `${dash} ${circumference - dash}`,
      // Rotate so arcs sit head-to-tail, starting at 12 o'clock.
      offset: -priorFraction * circumference,
    };
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.chartArea}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={ariaLabel}
          preserveAspectRatio="xMidYMid meet"
        >
          <title>{ariaLabel}</title>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle
              className={styles.track}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              strokeWidth={stroke}
            />
            {total > 0 &&
              arcs.map((a, i) => (
                <circle
                  key={`arc-${a.label || i}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={stroke}
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.offset}
                />
              ))}
          </g>
          {centerLabel != null && (
            <text className={styles.centerLabel} x={cx} y={cy - 1} textAnchor="middle">
              {centerLabel}
            </text>
          )}
          {centerSubLabel != null && (
            <text className={styles.centerSub} x={cx} y={cy + 14} textAnchor="middle">
              {centerSubLabel}
            </text>
          )}
        </svg>
      </div>

      <ul className={styles.legend}>
        {arcs.map((a, i) => (
          <li key={`leg-${a.label || i}`} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: a.color }} />
            <span className={styles.legendLabel}>{a.label}</span>
            <span className={styles.legendPct}>{a.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

DonutChart.propTypes = {
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
      color: PropTypes.string,
    })
  ),
  centerLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  centerSubLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  ariaLabel: PropTypes.string,
};
