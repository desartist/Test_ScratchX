"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./EmptyState.module.css";

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  size = "md",
}) {
  return (
    <div className={`${styles.empty} ${styles[size] || styles.md}`}>
      {icon != null && <div className={styles.icon}>{icon}</div>}
      {title && <p className={styles.title}>{title}</p>}
      {description && <p className={styles.description}>{description}</p>}
      {ctaLabel && onCta && (
        <button type="button" className={styles.cta} onClick={onCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  ctaLabel: PropTypes.string,
  onCta: PropTypes.func,
  size: PropTypes.oneOf(["sm", "md"]),
};
