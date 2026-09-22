"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./Skeleton.module.css";

/**
 * Inline shimmer placeholder for a single value that is still loading.
 *
 * The point is field-level loading: the page's structure, labels, colours and
 * buttons render immediately from static markup, and only the values that come
 * from the API/DB shimmer until they arrive. Size it to roughly the width of
 * the real value so nothing shifts when it swaps in.
 *
 *   <Skeleton w="3ch" />                    // a short number
 *   <Skeleton w="7em" onDark />             // text on the purple hero
 *
 * `w`/`h` accept any CSS length; `em`/`ch` units are preferred so the
 * placeholder scales with the surrounding font size.
 */
export default function Skeleton({ w = "4em", h = "1em", onDark = false, className = "", label = "Loading" }) {
  return (
    <span
      className={`${styles.skeleton} ${onDark ? styles.onDark : ""} ${className}`}
      style={{ width: w, height: h }}
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      role="status"
    />
  );
}

Skeleton.propTypes = {
  w: PropTypes.string,
  h: PropTypes.string,
  onDark: PropTypes.bool,
  className: PropTypes.string,
  label: PropTypes.string,
};
