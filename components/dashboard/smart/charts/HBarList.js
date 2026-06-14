"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./HBarList.module.css";

const defaultFormatter = (v) => v.toLocaleString();

export default function HBarList({
  items = [],
  max,
  valueFormatter = defaultFormatter,
  ariaLabel = "Ranked horizontal bar list",
}) {
  if (!items || items.length === 0) {
    return <div className={styles.empty}>No data yet</div>;
  }

  const computedMax =
    typeof max === "number" && max > 0
      ? max
      : items.reduce((m, it) => Math.max(m, it.value || 0), 0);
  const scaleMax = computedMax === 0 ? 1 : computedMax;

  return (
    <ol className={styles.list} role="img" aria-label={ariaLabel}>
      {items.map((it, i) => {
        const value = it.value || 0;
        const pct = Math.max(0, Math.min(100, (value / scaleMax) * 100));
        return (
          <li key={`row-${it.label || i}`} className={styles.row}>
            <span className={styles.rank}>{String(i + 1).padStart(2, "0")}</span>
            <div className={styles.body}>
              <div className={styles.topLine}>
                <span className={styles.label}>{it.label}</span>
                <span className={styles.value}>{valueFormatter(value)}</span>
              </div>
              <div className={styles.track}>
                <div className={styles.bar} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

HBarList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })
  ),
  max: PropTypes.number,
  valueFormatter: PropTypes.func,
  ariaLabel: PropTypes.string,
};
