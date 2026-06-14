"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./StatusBadge.module.css";

const STATUS_COLORS = {
  active: "#00b0b1",
  draft: "#6c757d",
  endingSoon: "#ff6b6b",
  ended: "#999",
};

export default function StatusBadge({ status = "active" }) {
  const statusLower = (status || "active").toLowerCase();
  const bgColor = STATUS_COLORS[statusLower] || STATUS_COLORS.draft;

  if (process.env.NODE_ENV === "development" && !STATUS_COLORS[statusLower]) {
    console.warn(
      `StatusBadge: Unknown status "${status}", using default color`,
    );
  }

  return (
    <div
      className={styles.badge}
      style={{
        backgroundColor: bgColor,
        textTransform: "capitalize",
      }}
      role="status"
      aria-label={`Campaign status: ${status}`}
    >
      {status}
    </div>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(["active", "draft", "endingSoon", "ended"]),
};
