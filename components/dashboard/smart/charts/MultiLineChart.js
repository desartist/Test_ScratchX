"use client";
import React, { useState } from "react";
import PropTypes from "prop-types";
import styles from "./MultiLineChart.module.css";

// Multi-series companion to LineAreaChart — same smooth Catmull-Rom bezier
// construction and viewBox scaling, extended to draw several named series
// (with a legend) sharing one y-axis instead of a single value+area fill.
export default function MultiLineChart({
  labels = [],
  series = [],
  height = 220,
  ariaLabel = "Line chart",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const hasValues = series.some((s) => (s.data || []).some((v) => (v || 0) > 0));
  if (!labels.length || !series.length || !hasValues) {
    return <div className={styles.empty}>No data yet</div>;
  }

  const VB_W = 640;
  const VB_H = 260;
  const padX = 16;
  const padTop = 20;
  const padBottom = 32;
  const plotW = VB_W - padX * 2;
  const plotH = VB_H - padTop - padBottom;
  const baselineY = padTop + plotH;

  const maxVal = series.reduce(
    (m, s) => Math.max(m, ...(s.data || []).map((v) => v || 0)),
    0,
  );
  const scaleMax = maxVal === 0 ? 1 : maxVal;

  const xFor = (i) =>
    labels.length === 1 ? padX + plotW / 2 : padX + (plotW * i) / (labels.length - 1);
  const yFor = (v) => baselineY - ((v || 0) / scaleMax) * plotH;

  const buildSmoothPath = (pts) => {
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const seriesPoints = series.map((s) => (s.data || []).map((v, i) => ({ x: xFor(i), y: yFor(v), value: v || 0 })));

  // Show every Nth x-axis label so ticks don't overlap on wide ranges.
  const tickStride = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <div className={styles.wrap}>
      <ul className={styles.legend}>
        {series.map((s) => (
          <li key={s.name} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <title>{ariaLabel}</title>

        {labels.map((_, i) => (
          <rect
            key={`hitzone-${i}`}
            x={xFor(i) - plotW / labels.length / 2}
            y={padTop}
            width={plotW / labels.length}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}

        {seriesPoints.map((pts, si) => (
          <path
            key={series[si].name}
            d={buildSmoothPath(pts)}
            fill="none"
            stroke={series[si].color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {hoverIndex != null && (
          <line
            className={styles.hoverLine}
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={padTop}
            y2={baselineY}
          />
        )}

        {seriesPoints.map((pts, si) =>
          pts.map((p, i) => (
            <circle
              key={`${series[si].name}-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 4.5 : 2.5}
              fill={series[si].color}
              stroke="#fff"
              strokeWidth="1.5"
            />
          )),
        )}

        {labels.map((label, i) =>
          i % tickStride === 0 ? (
            <text
              key={`lbl-${i}`}
              className={styles.tickLabel}
              x={xFor(i)}
              y={baselineY + 20}
              textAnchor="middle"
            >
              {label}
            </text>
          ) : null,
        )}

        {hoverIndex != null && (
          <g>
            <rect
              x={Math.min(Math.max(xFor(hoverIndex) - 70, 2), VB_W - 142)}
              y={padTop}
              width={140}
              height={16 + series.length * 14}
              rx="6"
              fill="var(--color-navy)"
            />
            <text
              className={styles.tipTitle}
              x={Math.min(Math.max(xFor(hoverIndex) - 70, 2), VB_W - 142) + 70}
              y={padTop + 12}
              textAnchor="middle"
            >
              {labels[hoverIndex]}
            </text>
            {series.map((s, si) => (
              <text
                key={`tip-${s.name}`}
                className={styles.tipText}
                x={Math.min(Math.max(xFor(hoverIndex) - 70, 2), VB_W - 142) + 10}
                y={padTop + 28 + si * 14}
              >
                {s.name}: {seriesPoints[si][hoverIndex]?.value ?? 0}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

MultiLineChart.propTypes = {
  labels: PropTypes.arrayOf(PropTypes.string),
  series: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      color: PropTypes.string,
      data: PropTypes.arrayOf(PropTypes.number),
    }),
  ),
  height: PropTypes.number,
  ariaLabel: PropTypes.string,
};
