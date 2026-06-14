"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./LineAreaChart.module.css";

export default function LineAreaChart({
  data = [],
  height = 180,
  color = "#6d5df6",
  highlightIndex,
  ariaLabel = "Line area chart",
}) {
  const reactId = React.useId();

  const hasValues = (data || []).some((d) => (d?.value || 0) > 0);
  if (!data || data.length === 0 || !hasValues) {
    return <div className={styles.empty}>No data yet</div>;
  }

  const VB_W = 320;
  const VB_H = 180;
  const padX = 12;
  const padTop = 28;
  const padBottom = 24;
  const plotW = VB_W - padX * 2;
  const plotH = VB_H - padTop - padBottom;
  const baselineY = padTop + plotH;

  const maxVal = data.reduce((m, d) => Math.max(m, d.value || 0), 0);
  const scaleMax = maxVal === 0 ? 1 : maxVal;

  // X positions. Single point => center it.
  const xFor = (i) =>
    data.length === 1 ? padX + plotW / 2 : padX + (plotW * i) / (data.length - 1);
  const yFor = (v) => baselineY - ((v || 0) / scaleMax) * plotH;

  const points = data.map((d, i) => ({
    x: xFor(i),
    y: yFor(d.value),
    label: d.label,
    value: d.value || 0,
  }));

  // Smooth path using Catmull-Rom -> cubic bezier.
  const buildSmoothPath = (pts) => {
    if (pts.length === 1) {
      return `M ${pts[0].x} ${pts[0].y}`;
    }
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

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length === 1
      ? `M ${points[0].x} ${baselineY} L ${points[0].x} ${points[0].y} L ${points[0].x} ${baselineY} Z`
      : `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  const gradId = `lineAreaGrad-${reactId}`;

  const hasHighlight =
    typeof highlightIndex === "number" &&
    highlightIndex >= 0 &&
    highlightIndex < points.length;
  const hp = hasHighlight ? points[highlightIndex] : null;

  // Tooltip box geometry (clamped within viewBox).
  const tipW = 84;
  const tipH = 20;
  let tipX = hp ? hp.x - tipW / 2 : 0;
  if (tipX < 2) tipX = 2;
  if (tipX + tipW > VB_W - 2) tipX = VB_W - 2 - tipW;
  const tipY = hp ? Math.max(2, hp.y - tipH - 10) : 0;

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
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <circle
            key={`pt-${p.label || i}`}
            cx={p.x}
            cy={p.y}
            r={hasHighlight && i === highlightIndex ? 4.5 : 3}
            fill={color}
            stroke="#fff"
            strokeWidth="1.5"
          />
        ))}

        {points.map((p, i) => (
          <text
            key={`lbl-${p.label || i}`}
            className={styles.tickLabel}
            x={p.x}
            y={baselineY + 16}
            textAnchor="middle"
          >
            {p.label}
          </text>
        ))}

        {hp && (
          <g>
            <line
              className={styles.tipStem}
              x1={hp.x}
              x2={hp.x}
              y1={tipY + tipH}
              y2={hp.y}
              stroke={color}
            />
            <rect
              x={tipX}
              y={tipY}
              width={tipW}
              height={tipH}
              rx="6"
              fill="var(--color-navy)"
            />
            <text
              className={styles.tipText}
              x={tipX + tipW / 2}
              y={tipY + tipH / 2 + 3.5}
              textAnchor="middle"
            >
              {hp.label} {hp.value} Scratches
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

LineAreaChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  height: PropTypes.number,
  color: PropTypes.string,
  highlightIndex: PropTypes.number,
  ariaLabel: PropTypes.string,
};
