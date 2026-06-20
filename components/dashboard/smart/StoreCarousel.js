"use client";
import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import Badge from "../Badge";
import styles from "./StoreCarousel.module.css";

const STATUS_VARIANT = { active: "success", inactive: "default", paused: "warning" };

function getBadge(isMainStore, hasPendingRequest, status) {
  if (isMainStore) return { label: "MAIN STORE", variant: "primary" };
  if (hasPendingRequest) return { label: "Pending Request", variant: "warning" };
  if (status) return { label: status, variant: STATUS_VARIANT[String(status).toLowerCase()] || "default" };
  return null;
}

function num(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }

function StoreCard({ store, stats, idx, onViewStore, onReview }) {
  const { name, status, address, city, scratchAllocated, scratchRemaining, campaignCount } = store;
  const isMain = idx === 0;
  const badge = getBadge(isMain, false, status);
  const used = num(scratchAllocated) - num(scratchRemaining);
  const location = address || city;

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardName}>{name || "Store"}</h3>
        {badge && <Badge label={badge.label} variant={badge.variant} />}
      </div>

      {location && (
        <span className={styles.location}>
          <MapPin size={13} />
          {location}
        </span>
      )}

      <div className={styles.meta}>
        <span>{num(stats?.scans || 0)} Scans</span>
        <span className={styles.sep}>·</span>
        <span>{num(campaignCount)} Campaigns</span>
      </div>

      {Number.isFinite(num(scratchAllocated)) && (
        <div className={styles.entitlement}>
          <span className={styles.entitlementLabel}>{num(scratchAllocated)} allocated</span>
          <span className={styles.usedLabel}>{used} Used</span>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onViewStore}>
          View Store
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnSolid}`} onClick={onReview}>
          Review
        </button>
      </div>
    </article>
  );
}

export default function StoreCarousel({ stores, storePerf, viewAllHref }) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [exitDir, setExitDir] = useState("left");
  const touchStartX = useRef(null);
  const total = stores.length;

  const goTo = useCallback((idx) => {
    if (idx === current || animating) return;
    setExitDir(idx > current ? "left" : "right");
    setAnimating(true);
    setTimeout(() => { setCurrent(idx); setAnimating(false); }, 300);
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

  const shadowAnimClass = animating ? styles.shadowAnim : "";
  const s = stores[current];
  const stats = storePerf?.perStore?.[String(s._id)] || {};

  return (
    <div className={styles.wrapper}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          Store Performance
          <span className={styles.sectionCount}> ({String(total).padStart(2, "0")})</span>
        </span>
        <a href={viewAllHref || "/stores"} className={styles.viewAll}>
          View all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>

      <div className={styles.stackArea} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {total > 1 && <div className={`${styles.shadowCard2} ${shadowAnimClass}`} />}
        {total > 2 && <div className={`${styles.shadowCard3} ${shadowAnimClass}`} />}

        <div className={`${styles.frontCard} ${animating ? (exitDir === "left" ? styles.exitLeft : styles.exitRight) : ""}`}>
          <StoreCard
            store={s}
            stats={stats}
            idx={current}
            onViewStore={() => router.push(`/stores/${s._id}`)}
            onReview={() => router.push(`/stores/${s._id}`)}
          />
        </div>
      </div>

      {total > 1 && (
        <div className={styles.controls}>
          <button className={styles.navBtn} onClick={prev} aria-label="Previous">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className={styles.dots}>
            {stores.map((_, i) => (
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
