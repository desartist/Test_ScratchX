"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./SkeletonCard.module.css";

/**
 * Placeholder for one card in a loading list/grid.
 *
 * List pages used to swap the whole grid for a "Loading stores…" line, which
 * collapsed the layout and told the user nothing about what was coming. This
 * keeps the grid's shape — same card chrome, roughly the same height — so the
 * page looks like itself while the rows are in flight.
 *
 *   {loading
 *     ? <SkeletonCardList count={6} />
 *     : items.map(...)}
 */
export default function SkeletonCard({ lines = 3, footer = false }) {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.row}>
        <div className={styles.line} style={{ width: "55%", height: "1.05rem" }} />
        <div className={styles.line} style={{ width: "18%", height: "0.85rem" }} />
      </div>
      {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
        <div
          key={i}
          className={styles.line}
          style={{ width: i % 2 === 0 ? "80%" : "62%", height: "0.8rem" }}
        />
      ))}
      {footer && (
        <div className={styles.footer}>
          <div className={styles.line} style={{ width: "48%", height: "2rem", borderRadius: 8 }} />
          <div className={styles.line} style={{ width: "48%", height: "2rem", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

SkeletonCard.propTypes = {
  lines: PropTypes.number,
  footer: PropTypes.bool,
};

/** Convenience wrapper: N placeholder cards, for dropping straight into a grid. */
export function SkeletonCardList({ count = 6, lines = 3, footer = false }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} footer={footer} />
      ))}
    </>
  );
}

SkeletonCardList.propTypes = {
  count: PropTypes.number,
  lines: PropTypes.number,
  footer: PropTypes.bool,
};
