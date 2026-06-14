"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./BarChart.module.css";

const DEFAULT_COLORS = { new: "#4c6ef5", repeat: "#6d5df6" };

export default function BarChart({
  data = [],
  colors = DEFAULT_COLORS,
  height = 200,
  ariaLabel = "Grouped bar chart",
}) {
  const hasValues = (data || []).some(
    (d) => (d?.series?.new || 0) > 0 || (d?.series?.repeat || 0) > 0
  );
  if (!data || data.length === 0 || !hasValues) {
    return <div className={styles.empty}>No data yet</div>;
  }

  const merged = { ...DEFAULT_COLORS, ...colors };

  // Geometry (in viewBox units).
  const VB_W = 320;
  const VB_H = 200;
  const padLeft = 28;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 28;
  const plotW = VB_W - padLeft - padRight;
  const plotH = VB_H - padTop - padBottom;
  const baselineY = padTop + plotH;

  // Largest value across both series; guard divide-by-zero.
  let maxVal = 0;
  data.forEach((d) => {
    const s = d.series || {};
    maxVal = Math.max(maxVal, s.new || 0, s.repeat || 0);
  });
  const scaleMax = maxVal === 0 ? 1 : maxVal;

  // Simple gridlines (4 steps).
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const v = (scaleMax / gridSteps) * i;
    const y = baselineY - (v / scaleMax) * plotH;
    return { y, v };
  });

  const slot = plotW / data.length;
  const barGap = slot * 0.12;
  const barW = (slot - barGap * 3) / 2;

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{ariaLabel}</title>

        {gridLines.map((g, i) => (
          <g key={`grid-${i}`}>
            <line
              className={styles.gridLine}
              x1={padLeft}
              x2={padLeft + plotW}
              y1={g.y}
              y2={g.y}
            />
            <text className={styles.axisLabel} x={padLeft - 6} y={g.y + 3} textAnchor="end">
              {Math.round(g.v)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const s = d.series || {};
          const groupX = padLeft + slot * i + barGap;
          const newVal = s.new || 0;
          const repeatVal = s.repeat || 0;
          const newH = (newVal / scaleMax) * plotH;
          const repeatH = (repeatVal / scaleMax) * plotH;
          return (
            <g key={`bar-${d.label || i}`}>
              <rect
                x={groupX}
                y={baselineY - newH}
                width={barW}
                height={newH}
                rx="3"
                fill={merged.new}
              />
              <rect
                x={groupX + barW + barGap}
                y={baselineY - repeatH}
                width={barW}
                height={repeatH}
                rx="3"
                fill={merged.repeat}
              />
              <text
                className={styles.tickLabel}
                x={groupX + barW + barGap / 2}
                y={baselineY + 16}
                textAnchor="middle"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: merged.new }} />
          New Customers
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} style={{ background: merged.repeat }} />
          Repeated Customers
        </span>
      </div>
    </div>
  );
}

BarChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      series: PropTypes.shape({
        new: PropTypes.number,
        repeat: PropTypes.number,
      }),
    })
  ),
  colors: PropTypes.shape({
    new: PropTypes.string,
    repeat: PropTypes.string,
  }),
  height: PropTypes.number,
  ariaLabel: PropTypes.string,
};
