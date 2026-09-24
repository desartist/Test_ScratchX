"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api, formatDateTime } from "@/lib/luckyDraw/clientApi";
import styles from "./luckyDraws.module.css";

const STATUS_LABEL = { draft: "Draft", active: "Active", paused: "Paused", ended: "Ended" };

function LuckyDrawList() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api("/api/lucky-draws/campaigns")
      .then((data) => !cancelled && setCampaigns(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lucky Draw</h1>
          <p className={styles.subtitle}>
            Customers earn entries from their bill amount. You decide when winners are drawn, and you can change the date at any time.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/lucky-draws/redeem" className={styles.secondaryButton}>Redeem a prize</Link>
          <Link href="/lucky-draws/new" className={styles.primaryButton}>New Lucky Draw</Link>
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {!campaigns && !error && <p className={styles.muted}>Loading…</p>}
      {campaigns && campaigns.length === 0 && (
        <div className={styles.empty}>
          <p>You have no Lucky Draws yet.</p>
          <Link href="/lucky-draws/new" className={styles.primaryButton}>Create your first Lucky Draw</Link>
        </div>
      )}

      <div className={styles.list}>
        {(campaigns || []).map((campaign) => (
          <Link key={campaign._id} href={`/lucky-draws/${campaign._id}`} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{campaign.name}</span>
              <span className={`${styles.chip} ${styles[`chip_${campaign.status}`]}`}>{STATUS_LABEL[campaign.status]}</span>
            </div>
            <div className={styles.cardMeta}>
              <span>{campaign.drawConfig.triggerMode === "automatic" ? "Draws automatically" : "You run the draw"}</span>
              <span>Next draw: {campaign.nextDrawDate ? formatDateTime(campaign.nextDrawDate) : "—"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function LuckyDrawsPage() {
  return (
    <FlagGate>
      <LuckyDrawList />
    </FlagGate>
  );
}
