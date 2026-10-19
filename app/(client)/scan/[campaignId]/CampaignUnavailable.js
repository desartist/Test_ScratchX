"use client";

import React from "react";
import Image from "next/image";
import { CalendarClock, CirclePause, Hourglass, SearchX, WifiOff, Store, RefreshCw } from "lucide-react";
import styles from "./CampaignUnavailable.module.css";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

/** "Starts today" / "Starts tomorrow" / "Starts in 5 days" (calendar days). */
function startsIn(startDate, now = new Date()) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(new Date(startDate)) - day(now)) / 86400000);
  if (days <= 0) return "Starts today";
  if (days === 1) return "Starts tomorrow";
  return `Starts in ${days} days`;
}

/**
 * What a customer sees when the QR they scanned can't be played right now —
 * one clear reason (from GET /api/customer/campaign/[id]'s `code`) and what
 * to do next. Campaigns that have ENDED have their own screen in page.js.
 *
 * Props:
 *   - code: "NOT_STARTED" | "PAUSED" | "NOT_LIVE" | "NOT_FOUND" | "ERROR"
 *   - campaign: { campaignName, storeName, startDate, endDate } (when known)
 *   - onRetry: reload (shown for ERROR)
 */
export default function CampaignUnavailable({ code, campaign, onRetry }) {
  const name = campaign?.campaignName;
  const store = campaign?.storeName;

  const view = {
    NOT_STARTED: {
      tone: "soon",
      Icon: CalendarClock,
      title: "Starting Soon",
      message: "This offer isn't open yet. Come back and scan the QR code again once it starts.",
    },
    PAUSED: {
      tone: "paused",
      Icon: CirclePause,
      title: "Campaign Paused",
      message: "This offer is taking a short break. Please check back later or ask the store staff.",
    },
    NOT_LIVE: {
      tone: "paused",
      Icon: Hourglass,
      title: "Not Live Yet",
      message: "This campaign hasn't been launched yet. Please ask the store staff for help.",
    },
    NOT_FOUND: {
      tone: "missing",
      Icon: SearchX,
      title: "Campaign Not Found",
      message: "This QR code doesn't match any running campaign. It may have been removed — please ask the store staff for the latest QR code.",
    },
    ERROR: {
      tone: "missing",
      Icon: WifiOff,
      title: "Couldn't Load the Offer",
      message: "Please check your internet connection and try again.",
    },
  }[code] || {
    tone: "missing",
    Icon: SearchX,
    title: "Campaign Not Available",
    message: "This offer can't be opened right now. Please ask the store staff for help.",
  };
  const { Icon } = view;

  return (
    <main className={styles.page}>
      <div className={styles.logo}>
        <Image src="/horizontal_logo.webp" alt="ScratchX" width={140} height={50} priority />
      </div>

      <section className={`${styles.card} ${styles[view.tone]}`} aria-live="polite">
        <span className={styles.iconRing} aria-hidden="true">
          <Icon size={34} strokeWidth={2} />
        </span>

        <h1 className={styles.title}>{view.title}</h1>

        {(name || store) && (
          <p className={styles.chip}>
            {store && (
              <>
                <Store size={14} aria-hidden="true" />
                <span>{store}</span>
              </>
            )}
            {store && name && <span className={styles.dot} aria-hidden="true">•</span>}
            {name && <span>{name}</span>}
          </p>
        )}

        {code === "NOT_STARTED" && campaign?.startDate && (
          <div className={styles.dateBox}>
            <span className={styles.dateLabel}>{startsIn(campaign.startDate)}</span>
            <span className={styles.dateValue}>{fmtDate(campaign.startDate)}</span>
            {campaign.endDate && (
              <span className={styles.dateSub}>Runs until {fmtDate(campaign.endDate)}</span>
            )}
          </div>
        )}

        <p className={styles.message}>{view.message}</p>

        {code === "ERROR" && onRetry && (
          <button type="button" className={styles.retryBtn} onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            Try Again
          </button>
        )}
      </section>

      <p className={styles.footer}>Powered by ScratchX</p>
    </main>
  );
}
