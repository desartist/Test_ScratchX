'use client';

import React, { useMemo } from 'react';
import styles from './CampaignAnalyticsChart.module.css';

export default function CampaignAnalyticsChart({
  type = 'line',
  data = [],
  title = 'Chart',
  dataKey = 'value',
  labelKey = 'label',
  color = '#2563eb'
}) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    return data;
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(item => item[dataKey] || 0));
  const chartHeight = 250;
  const chartWidth = Math.max(chartData.length * 50, 400);

  // SVG Line Chart
  if (type === 'line') {
    const points = chartData.map((item, index) => {
      const x = (index / (chartData.length - 1 || 1)) * (chartWidth - 60);
      const y = chartHeight - ((item[dataKey] || 0) / maxValue) * (chartHeight - 40);
      return { x: x + 30, y, index, item };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className={styles.container}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.chartWrapper}>
          <svg width={chartWidth} height={chartHeight} className={styles.svg}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <line
                key={`grid-${i}`}
                x1="20"
                y1={chartHeight - fraction * (chartHeight - 40) - 20}
                x2={chartWidth - 40}
                y2={chartHeight - fraction * (chartHeight - 40) - 20}
                className={styles.gridLine}
              />
            ))}

            {/* Y-axis */}
            <line x1="20" y1="20" x2="20" y2={chartHeight - 20} className={styles.axis} />

            {/* X-axis */}
            <line
              x1="20"
              y1={chartHeight - 20}
              x2={chartWidth - 20}
              y2={chartHeight - 20}
              className={styles.axis}
            />

            {/* Line path */}
            <path d={pathData} className={styles.line} stroke={color} fill="none" />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={`point-${i}`}
                cx={p.x}
                cy={p.y}
                r="4"
                className={styles.point}
                fill={color}
              />
            ))}

            {/* Labels */}
            {points.map((p, i) => (
              <text
                key={`label-${i}`}
                x={p.x}
                y={chartHeight - 5}
                className={styles.label}
                textAnchor="middle"
              >
                {p.item[labelKey]}
              </text>
            ))}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <text
                key={`y-label-${i}`}
                x="15"
                y={chartHeight - fraction * (chartHeight - 40) - 20 + 4}
                className={styles.yLabel}
                textAnchor="end"
              >
                {Math.round(fraction * maxValue)}
              </text>
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // Bar Chart
  if (type === 'bar') {
    const barWidth = Math.max(20, Math.min(40, (chartWidth - 60) / chartData.length));
    const spacing = (chartWidth - 60) / chartData.length;

    return (
      <div className={styles.container}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.chartWrapper}>
          <svg width={chartWidth} height={chartHeight} className={styles.svg}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <line
                key={`grid-${i}`}
                x1="20"
                y1={chartHeight - fraction * (chartHeight - 40) - 20}
                x2={chartWidth - 40}
                y2={chartHeight - fraction * (chartHeight - 40) - 20}
                className={styles.gridLine}
              />
            ))}

            {/* Y-axis */}
            <line x1="20" y1="20" x2="20" y2={chartHeight - 20} className={styles.axis} />

            {/* X-axis */}
            <line
              x1="20"
              y1={chartHeight - 20}
              x2={chartWidth - 20}
              y2={chartHeight - 20}
              className={styles.axis}
            />

            {/* Bars */}
            {chartData.map((item, i) => {
              const x = 30 + i * spacing + (spacing - barWidth) / 2;
              const value = item[dataKey] || 0;
              const barHeight = (value / maxValue) * (chartHeight - 40);
              const y = chartHeight - 20 - barHeight;

              return (
                <g key={`bar-${i}`}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    className={styles.bar}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 5}
                    className={styles.label}
                    textAnchor="middle"
                  >
                    {item[labelKey]}
                  </text>
                </g>
              );
            })}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <text
                key={`y-label-${i}`}
                x="15"
                y={chartHeight - fraction * (chartHeight - 40) - 20 + 4}
                className={styles.yLabel}
                textAnchor="end"
              >
                {Math.round(fraction * maxValue)}
              </text>
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // Area Chart
  if (type === 'area') {
    const points = chartData.map((item, index) => {
      const x = (index / (chartData.length - 1 || 1)) * (chartWidth - 60);
      const y = chartHeight - ((item[dataKey] || 0) / maxValue) * (chartHeight - 40);
      return { x: x + 30, y, index, item };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath =
      pathData + ` L ${points[points.length - 1].x} ${chartHeight - 20} L 30 ${chartHeight - 20} Z`;

    return (
      <div className={styles.container}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.chartWrapper}>
          <svg width={chartWidth} height={chartHeight} className={styles.svg}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <line
                key={`grid-${i}`}
                x1="20"
                y1={chartHeight - fraction * (chartHeight - 40) - 20}
                x2={chartWidth - 40}
                y2={chartHeight - fraction * (chartHeight - 40) - 20}
                className={styles.gridLine}
              />
            ))}

            {/* Y-axis */}
            <line x1="20" y1="20" x2="20" y2={chartHeight - 20} className={styles.axis} />

            {/* X-axis */}
            <line
              x1="20"
              y1={chartHeight - 20}
              x2={chartWidth - 20}
              y2={chartHeight - 20}
              className={styles.axis}
            />

            {/* Area fill */}
            <path d={areaPath} className={styles.area} fill={color} fillOpacity="0.2" />

            {/* Line path */}
            <path d={pathData} className={styles.line} stroke={color} fill="none" />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={`point-${i}`}
                cx={p.x}
                cy={p.y}
                r="4"
                className={styles.point}
                fill={color}
              />
            ))}

            {/* Labels */}
            {points.map((p, i) => (
              <text
                key={`label-${i}`}
                x={p.x}
                y={chartHeight - 5}
                className={styles.label}
                textAnchor="middle"
              >
                {p.item[labelKey]}
              </text>
            ))}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <text
                key={`y-label-${i}`}
                x="15"
                y={chartHeight - fraction * (chartHeight - 40) - 20 + 4}
                className={styles.yLabel}
                textAnchor="end"
              >
                {Math.round(fraction * maxValue)}
              </text>
            ))}
          </svg>
        </div>
      </div>
    );
  }

  return null;
}
