"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./QuickActions.module.css";

export default function QuickActions({ actions }) {
  const list = Array.isArray(actions) ? actions : [];

  if (list.length === 0) return null;

  return (
    <div className={styles.scroller}>
      <div className={styles.grid}>
        {list.map((action, index) => {
          const key = action.href || action.label || index;
          const content = (
            <>
              {action.icon != null && (
                <span className={styles.icon}>{action.icon}</span>
              )}
              <span className={styles.label}>{action.label}</span>
            </>
          );

          if (action.href) {
            return (
              <a
                key={key}
                className={styles.card}
                href={action.href}
                onClick={action.onClick}
              >
                {content}
              </a>
            );
          }

          return (
            <button
              key={key}
              type="button"
              className={styles.card}
              onClick={action.onClick}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

QuickActions.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      icon: PropTypes.node,
      href: PropTypes.string,
      onClick: PropTypes.func,
    })
  ),
};
