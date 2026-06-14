"use client";
import React from "react";
import PropTypes from "prop-types";
import styles from "./SubscriptionHero.module.css";

function fallback(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

export default function SubscriptionHero({
  planName,
  status,
  dayOf,
  totalDays,
  validUntil,
  used,
  daysRemaining,
  onViewUsage,
  onChoosePlans,
}) {
  const showDayPill = dayOf != null && totalDays != null;
  const expiringSoon =
    daysRemaining != null &&
    Number.isFinite(daysRemaining) &&
    daysRemaining <= 7;

  return (
    <section className={styles.hero}>
      <div className={styles.topRow}>
        <span className={styles.planName}>{fallback(planName)}</span>
        {showDayPill && (
          <span className={styles.dayPill}>
            Day {dayOf} of {totalDays}
          </span>
        )}
      </div>

      <h2 className={styles.bigLabel}>Unlimited Scratches</h2>
      <p className={styles.validUntil}>Valid until {fallback(validUntil)}</p>

      <div className={styles.stats}>
        <div className={styles.statCol}>
          <span className={styles.statValue}>{fallback(used)}</span>
          <span className={styles.statLabel}>Used</span>
        </div>
        <div className={styles.statCol}>
          <span className={styles.statValue}>{fallback(daysRemaining)}</span>
          <span className={styles.statLabel}>Days Access left</span>
        </div>
      </div>

      {expiringSoon && (
        <div className={styles.warning}>
          <span aria-hidden="true">⚠</span> Unlimited Scratches expire in{" "}
          {daysRemaining} days.
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnLight}`}
          onClick={onViewUsage}
        >
          View Usage
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSolid}`}
          onClick={onChoosePlans}
        >
          Choose Plans
        </button>
      </div>

      {status && <span className={styles.srOnly}>Status: {status}</span>}
    </section>
  );
}

SubscriptionHero.propTypes = {
  planName: PropTypes.string,
  status: PropTypes.string,
  dayOf: PropTypes.number,
  totalDays: PropTypes.number,
  validUntil: PropTypes.string,
  used: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  daysRemaining: PropTypes.number,
  onViewUsage: PropTypes.func,
  onChoosePlans: PropTypes.func,
};
