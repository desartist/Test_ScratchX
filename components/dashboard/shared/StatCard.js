"use client";
import React from "react";
import Link from "next/link";
import styles from "./StatCard.module.css";

// Shared metric/stat card used across all Super Admin pages — icon chip +
// big value + label, with an optional subtitle line underneath. Matches the
// Figma card spec: generous padding, rounded icon chip, indigo accent
// (#6d5df6) already used elsewhere in the app for charts (DonutChart,
// LineAreaChart) — this ties the new card language to an existing color
// rather than inventing a one-off hex.
export default function StatCard({ icon, value, label, subtitle, href, onClick, tone = "indigo" }) {
  const hasValue = value !== undefined && value !== null && value !== '';

  const content = (
    <>
      <div className={styles.topRow}>
        <div className={`${styles.iconChip} ${styles[`tone-${tone}`]}`}>{icon}</div>
        <div className={styles.textGroup}>
          {hasValue ? (
            <>
              <p className={styles.value}>{value}</p>
              <p className={styles.label}>{label}</p>
            </>
          ) : (
            <p className={styles.labelOnly}>{label}</p>
          )}
        </div>
      </div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${styles.card} ${styles.cardLink}`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div
        className={`${styles.card} ${styles.cardLink}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick(e);
        }}
      >
        {content}
      </div>
    );
  }

  return <div className={styles.card}>{content}</div>;
}
