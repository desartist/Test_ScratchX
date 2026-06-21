"use client";
import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./CampaignCarousel.module.css";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function num(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }

const STATUS_COLOR = {
  active:    { bg: "#e8fff0", color: "#16a34a", dot: "#22c55e" },
  draft:     { bg: "#f0f2ff", color: "#4f46e5", dot: "#6c5ce7" },
  paused:    { bg: "#fff8ec", color: "#b45309", dot: "#f59e0b" },
  expired:   { bg: "#fff0f0", color: "#dc2626", dot: "#ef4444" },
  scheduled: { bg: "#f0f8ff", color: "#0369a1", dot: "#38bdf8" },
};

const STATUS_LABEL = {
  active:    "ACTIVE",
  performing: "PERFORMING",
  draft:     "DRAFT",
  paused:    "PAUSED",
  expired:   "EXPIRED",
  scheduled: "SCHEDULED",
};

function CampaignCard({ campaign, storeCount, onClick }) {
  const {
    name, status, startDate, endDate,
    billingRange, billingRangeLabel,
    allocatedCards = 0, remainingCards = 0,
  } = campaign;

  const daysLeft = Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / 86400000));
  const used = num(allocatedCards) - num(remainingCards);
  const total = num(allocatedCards);
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const left = Math.max(0, total - used);
  const isLow = total > 0 && left / total < 0.15;
  const statusKey = (status || "draft").toLowerCase();
  const statusLabel = STATUS_LABEL[statusKey] || statusKey.toUpperCase();

  // Days color: green if >30, orange if 8-30, red if ≤7
  const daysColor = daysLeft > 30 ? "#16a34a" : daysLeft > 7 ? "#f59e0b" : "#ef4444";

  return (
    <div className={styles.card} onClick={onClick}>
      {/* ── Header ── */}
      <div className={styles.cardHeader}>
        <div className={styles.cardLeft}>
          <h3 className={styles.cardName}>{name || "Untitled"}</h3>
          <p className={styles.cardDates}>{formatDate(startDate)} - {formatDate(endDate)}</p>
          <span className={styles.statusBadge} style={{ background: STATUS_COLOR[statusKey]?.bg, color: STATUS_COLOR[statusKey]?.color }}>
            <span className={styles.statusDot} style={{ background: STATUS_COLOR[statusKey]?.dot }} />
            {statusLabel}
          </span>
        </div>
        <div className={styles.daysBox}>
          <svg className={styles.clockIcon} width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={daysColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className={styles.daysNum} style={{ color: daysColor }}>{daysLeft} days</span>
          <span className={styles.daysLabel}>Remaining</span>
        </div>
      </div>

      {/* ── Price row — only when billing range exists ── */}
      {billingRange && billingRange !== "₹0" && (
        <div className={styles.statusPriceRow}>
          <div className={styles.statusBlock}>
            <span className={styles.statusText}>{statusLabel}</span>
            {billingRangeLabel && (
              <span className={styles.billingLabel}>{billingRangeLabel}</span>
            )}
          </div>
          <span className={styles.priceRange}>{billingRange}</span>
        </div>
      )}

      {/* ── Scratch Allocation ── */}
      {total > 0 && (
        <div className={styles.allocation}>
          <div className={styles.allocHeader}>
            <span className={styles.allocLabel}>Scratch Allocation</span>
            <span className={styles.allocCount}>
              {used.toLocaleString("en-IN")} / {total.toLocaleString("en-IN")}
            </span>
          </div>
          <div className={styles.bar}>
            <div
              className={styles.barFill}
              style={{ width: `${pct}%`, background: isLow ? "#ef4444" : "#6c5ce7" }}
            />
          </div>
          <div className={styles.allocFooter}>
            <span className={styles.leftCount} style={{ color: isLow ? "#ef4444" : "#9ba8b8" }}>
              {left.toLocaleString("en-IN")} left
            </span>
          </div>

          {/* Low warning row */}
          {isLow && (
            <div className={styles.lowRow}>
              <span className={styles.lowWarn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Only {left.toLocaleString("en-IN")} scratches left
              </span>
              <button
                className={styles.addBtn}
                onClick={(e) => { e.stopPropagation(); /* TODO: open top-up flow */ }}
              >
                + Add
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className={styles.cardFooter}>
        <span className={styles.storeCount}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          {storeCount} store{storeCount !== 1 ? "s" : ""}
        </span>
        <span className={styles.viewHint}>Tap to view →</span>
      </div>
    </div>
  );
}

export default function CampaignCarousel({ campaigns, storeCount, viewAllHref }) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [exitDir, setExitDir] = useState("left");
  const touchStartX = useRef(null);
  const total = campaigns.length;

  const goTo = useCallback((idx) => {
    if (idx === current || animating) return;
    setExitDir(idx > current ? "left" : "right");
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  }, [current, animating]);

  const next = () => goTo((current + 1) % total);
  const prev = () => goTo((current - 1 + total) % total);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) dx > 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (!total) return null;

  const shadowAnimClass = animating ? (exitDir === "left" ? styles.shadowExitLeft : styles.shadowExitRight) : "";

  return (
    <div className={styles.wrapper}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          Active Campaigns
          <span className={styles.sectionCount}> ({String(total).padStart(2, "0")})</span>
        </span>
        <a href={viewAllHref || "/campaign"} className={styles.viewAll}>
          View all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>

      {/* Stack area */}
      <div className={styles.stackArea} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {total > 1 && <div className={`${styles.shadowCard2} ${shadowAnimClass}`} />}
        {total > 2 && <div className={`${styles.shadowCard3} ${shadowAnimClass}`} />}

        <div className={`${styles.frontCard} ${animating ? (exitDir === "left" ? styles.exitLeft : styles.exitRight) : ""}`}>
          <CampaignCard
            campaign={campaigns[current]}
            storeCount={storeCount}
            onClick={() => router.push(`/campaign/${campaigns[current]._id}`)}
          />
        </div>
      </div>

      {/* Controls — hidden on mobile */}
      {total > 1 && (
        <div className={styles.controls}>
          <button className={styles.navBtn} onClick={prev} aria-label="Previous">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className={styles.dots}>
            {campaigns.map((_, i) => (
              <button key={i} className={`${styles.dotBtn} ${i === current ? styles.dotActive : ""}`} onClick={() => goTo(i)} />
            ))}
          </div>
          <button className={styles.navBtn} onClick={next} aria-label="Next">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
