"use client";
import React from "react";
import PropTypes from "prop-types";
import Skeleton from "@/components/ui/Skeleton";
import styles from "./SubscriptionHero.module.css";

function fallback(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

export default function SubscriptionHero({
  loading = false,
  planName,
  status,
  dayOf,
  totalDays,
  validUntil,
  used,
  daysRemaining,
  trend,
  onViewUsage,
  onChoosePlans,
}) {
  // While loading we still render the pill/label slots so the card's layout is
  // final from the first paint — only their contents shimmer.
  const showDayPill = loading || (dayOf != null && totalDays != null);
  const expiringSoon =
    !loading &&
    daysRemaining != null &&
    Number.isFinite(daysRemaining) &&
    daysRemaining <= 7;

  return (
    <section className={styles.hero}>
      {/* Top row: plan name + day counter + trend */}
      <div className={styles.topRow}>
        <div className={styles.topLeft}>
           {showDayPill && (
            <span className={styles.dayPill}>
              {loading ? <Skeleton w="7ch" onDark /> : <>Day {dayOf} of {totalDays}</>}
            </span>
          )}
          {(loading || planName) && (
            <span className={styles.planLabel}>
              {loading ? <Skeleton w="9ch" onDark /> : planName}
            </span>
          )}
         
        </div>
        {trend && (
          <span className={styles.trendPill}>
            ↑ {trend}
          </span>
        )}
      </div>

      <h2 className={styles.bigLabel}>Unlimited Scratches</h2>
      <p className={styles.validUntil}>
        Valid until {loading ? <Skeleton w="11ch" onDark /> : fallback(validUntil)}
      </p>

      <div className={styles.stats}>
        <div className={styles.statCol}>
          <span className={styles.statValue}>
            {loading ? <Skeleton w="2ch" h="0.8em" onDark /> : fallback(used)}
          </span>
          <span className={styles.statLabel}>Used</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCol}>
          <span className={styles.statValue}>
            {loading ? <Skeleton w="3ch" h="0.8em" onDark /> : fallback(daysRemaining)}
          </span>
          <span className={styles.statLabel}>Days Access left</span>
        </div>
      </div>

      {expiringSoon && (
        <div className={styles.warning}>
          ⚠ Unlimited scratch cards / year expire in {daysRemaining} days.
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
  loading: PropTypes.bool,
  planName: PropTypes.string,
  status: PropTypes.string,
  dayOf: PropTypes.number,
  totalDays: PropTypes.number,
  validUntil: PropTypes.string,
  used: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  daysRemaining: PropTypes.number,
  trend: PropTypes.string,
  onViewUsage: PropTypes.func,
  onChoosePlans: PropTypes.func,
};
