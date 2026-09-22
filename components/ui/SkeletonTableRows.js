"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./SkeletonCard.module.css";

/**
 * Placeholder rows for a table that is still loading.
 *
 * Replaces the `<tr><td colSpan={n}>Loading…</td></tr>` pattern: the table
 * keeps its real column widths and height instead of collapsing to a single
 * line of text, so the header, filters and surrounding chrome stay put and
 * nothing jumps when the data lands.
 */
export default function SkeletonTableRows({ rows = 5, cols = 5, asTable = false }) {
  const body = (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}>
              <div
                className={styles.line}
                style={{
                  // Vary the widths a little so it reads as content rather
                  // than a block of identical bars.
                  width: c === 0 ? "70%" : c === cols - 1 ? "45%" : "60%",
                  height: "0.85rem",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  // Some pages swap out the whole table while loading, so there's no <table>
  // for the rows to live in — `asTable` supplies one, keeping the markup valid.
  if (asTable) {
    return (
      <table className={styles.skeletonTable}>
        <tbody>{body}</tbody>
      </table>
    );
  }

  return body;
}

SkeletonTableRows.propTypes = {
  rows: PropTypes.number,
  cols: PropTypes.number,
  asTable: PropTypes.bool,
};
