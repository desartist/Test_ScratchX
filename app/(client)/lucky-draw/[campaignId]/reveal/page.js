"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Crown, Gift, Lock } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR } from "@/lib/luckyDraw/calculator";
import { formatDayTime } from "@/lib/luckyDraw/display";
import styles from "./reveal.module.css";

const POLL_LIVE_MS = 4000;
const POLL_WAITING_MS = 20000;

function RevealStage() {
  const { campaignId } = useParams();
  const [view, setView] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [fresh, setFresh] = useState(new Set());
  const seen = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/customer/lucky-draw/campaigns/${campaignId}/reveal`);
      setError("");
      setView(data);
      const revealed = data.categories.filter((c) => c.revealed).map((c) => c.rank);
      // Categories revealed since the last look get the scratch animation and come into view.
      if (seen.current) {
        const newly = revealed.filter((rank) => !seen.current.has(rank));
        if (newly.length) {
          setFresh(new Set(newly));
          setSelected(newly[newly.length - 1]);
        }
      } else {
        setSelected(revealed.length ? revealed[revealed.length - 1] : data.categories[0]?.rank ?? null);
      }
      seen.current = new Set(revealed);
    } catch (err) {
      setError(err.message);
    }
  }, [campaignId]);

  useEffect(() => {
    // First load runs as a timer callback, like the polling below.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!view || view.status === "done") return undefined;
    const timer = setInterval(load, view.status === "live" ? POLL_LIVE_MS : POLL_WAITING_MS);
    return () => clearInterval(timer);
  }, [view, load]);

  if (error && !view) {
    return (
      <div className={styles.page}><div className={styles.stage}><p className={styles.error} role="alert">{error}</p></div></div>
    );
  }
  if (!view) {
    return (
      <div className={styles.page}><div className={styles.stage}><p className={styles.sub} style={{ padding: 20 }}>Loading…</p></div></div>
    );
  }

  const category = view.categories.find((c) => c.rank === selected) || view.categories[0];
  const nextUp = view.categories[view.revealedCount];

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <div className={styles.top}>
          <span>{view.storeNames.join(" · ")}</span>
          {view.status === "live" && <span className={styles.live}>LIVE</span>}
          {view.status === "done" && <span className={`${styles.live} ${styles.done}`}>RESULTS</span>}
        </div>
        <div className={styles.head}>
          <h1>{view.name}</h1>
          <p className={styles.sub}>
            {view.status === "not_started"
              ? `Winners are revealed on ${formatDayTime(view.revealDate)}. Keep this page open.`
              : view.status === "live"
                ? `${view.revealedCount} of ${view.totalCategories} prizes revealed. ${nextUp ? `Next: ${nextUp.name}.` : ""}`
                : "Every prize has been revealed."}
          </p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Prize categories">
          {view.categories.map((c) => (
            <button key={c.rank} type="button" role="tab" aria-selected={c.rank === category?.rank} className={`${styles.tab} ${c.rank === category?.rank ? styles.tabOn : ""}`} onClick={() => setSelected(c.rank)}>
              <b>{formatINR(c.value)}</b>
              {c.revealed ? c.name : <span className={styles.lockLabel}><Lock size={11} aria-hidden="true" />{c.name}</span>}
            </button>
          ))}
        </div>

        {category && (
          <section className={styles.panel} aria-live="polite">
            <div className={styles.prizeHead}>
              {category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.prizeImg} src={category.imageUrl} alt={category.name} />
              ) : (
                <span className={styles.prizeImg} aria-hidden="true">{category.rank === view.categories[view.categories.length - 1]?.rank ? <Crown size={26} /> : <Gift size={26} />}</span>
              )}
              <div>
                <strong>{category.name}</strong>
                <span>{category.quantity} winner{category.quantity === 1 ? "" : "s"} · {formatINR(category.value)}{category.quantity > 1 ? " each" : ""}</span>
              </div>
            </div>

            {category.revealed ? (
              category.winners.length ? (
                <div className={styles.codes}>
                  {category.winners.map((w, i) => (
                    <div key={`${w.label}-${i}`} className={`${styles.win} ${fresh.has(category.rank) ? styles.fresh : ""}`} style={{ "--i": i }}>
                      <b>{w.label}</b>
                      {w.sub && <small>{w.sub}</small>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.sub}>Nobody was eligible for this prize.</p>
              )
            ) : (
              <div className={styles.locked}>
                <Lock size={28} aria-hidden="true" />
                <b>{view.status === "not_started" ? "Not revealed yet" : nextUp?.rank === category.rank ? "Up next" : "Revealed later"}</b>
                <span>Prizes are revealed smallest first, so the biggest prize comes last. Stay on this page.</span>
              </div>
            )}
          </section>
        )}

        <p className={styles.foot}>Winners are picked at random by ScratchX from every QR entry. Each customer can win only once.</p>
      </div>
    </div>
  );
}

export default function RevealPage() {
  return (
    <FlagGate>
      <RevealStage />
    </FlagGate>
  );
}
