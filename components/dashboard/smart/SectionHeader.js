"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./SectionHeader.module.css";

export default function SectionHeader({ title, onViewAll, viewAllHref }) {
  const showViewAll = Boolean(onViewAll) || Boolean(viewAllHref);

  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>

      {showViewAll &&
        (viewAllHref ? (
          <a className={styles.viewAll} href={viewAllHref} onClick={onViewAll}>
            View all <span className={styles.chevron}>›</span>
          </a>
        ) : (
          <button type="button" className={styles.viewAll} onClick={onViewAll}>
            View all <span className={styles.chevron}>›</span>
          </button>
        ))}
    </div>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onViewAll: PropTypes.func,
  viewAllHref: PropTypes.string,
};
