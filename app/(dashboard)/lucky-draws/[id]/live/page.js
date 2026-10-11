"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Crown, ExternalLink, Info, Lock, Play, Radio, Smartphone } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { formatDayTime } from "@/lib/luckyDraw/display";
import styles from "../../luckyDraws.module.css";

function LiveReveal() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [frameKey, setFrameKey] = useState(0);
  // The phone preview is a second copy of the reveal page; on a phone the owner opens the real one instead.
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, v] = await Promise.all([api(`/api/lucky-draws/campaigns/${id}`), api(`/api/customer/lucky-draw/campaigns/${id}/reveal`)]);
      setDetail(d);
      setView(v);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, [load]);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const update = () => setShowPreview(wide.matches);
    update();
    wide.addEventListener("change", update);
    return () => wide.removeEventListener("change", update);
  }, []);

  async function act(label, path) {
    setBusy(label);
    setError("");
    try {
      await api(path, { method: "POST" });
      await load();
      setFrameKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  if (!detail || !view) {
    return (
      <div className={styles.container}>
        {error ? <p className={styles.error} role="alert">{error}</p> : <p className={styles.muted}>Loading…</p>}
      </div>
    );
  }

  const { campaign, openDraw, pastDraws } = detail;
  const draw = pastDraws[0];
  const isLive = campaign.revealMode === "live";
  const entryCount = openDraw?.entryCount ?? 0;
  const started = view.status !== "not_started";
  const done = view.status === "done";
  const next = view.categories[view.revealedCount];
  const entriesOpen = new Date(campaign.endDate) > new Date();
  const link = `${origin}/lucky-draw/${id}/reveal`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy did not work. Select the link and copy it.");
    }
  };

  return (
    <div className={styles.container}>
      <Link href={`/lucky-draws/${id}`} className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />{campaign.name}</Link>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.title} ${styles.titleRow}`}>
            Live reveal
            <span className={`${styles.pill} ${styles[done ? "pill_done" : started ? "pill_live" : "pill_scheduled"]}`}>{done ? "Finished" : started ? "Live" : "Not started"}</span>
          </h1>
          <p className={styles.subtitle}>
            {formatDayTime(view.revealDate)}
            {draw ? ` · ${formatNumber(draw.entryCount)} entries in the draw` : openDraw ? ` · ${formatNumber(entryCount)} ${entryCount === 1 ? "entry" : "entries"} so far` : ""}
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={copy}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? "Copied" : "Copy watch link"}</button>
          <a className={styles.secondaryButton} href={`/lucky-draw/${id}/reveal`} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Open reveal page</a>
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.liveGrid}>
        <div className={styles.stack}>
          {!started && isLive && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ready when you are</h2>
              <p className={styles.muted}>
                Share the watch link with your customers, then start. ScratchX picks the winners at random from all {formatNumber(entryCount)} QR {entryCount === 1 ? "entry" : "entries"}. Nothing is shown until you reveal each prize, and each winner gets an SMS when their prize is revealed.
              </p>
              {entriesOpen && <p className={styles.notice}>Entries are open until {formatDayTime(campaign.endDate)}. You can start the reveal after that.</p>}
              {!entriesOpen && entryCount === 0 && <p className={styles.notice}>Nobody entered this draw, so there are no winners to reveal.</p>}
              <div>
                <button type="button" className={styles.primaryButton} disabled={busy !== "" || entriesOpen || entryCount === 0 || !openDraw} onClick={() => act("start", `/api/lucky-draws/draws/${openDraw._id}/reveal/start`)}>
                  <Play size={16} aria-hidden="true" />{busy === "start" ? "Picking winners…" : "Start live reveal"}
                </button>
              </div>
            </section>
          )}

          {!isLive && !started && (
            <p className={styles.notice}>This draw shows every winner at once. Results appear here once the draw has run.</p>
          )}

          <div className={styles.panel}>
            <div className={styles.panelHead}><h2 className={styles.sectionTitle}>Prizes</h2><span className={styles.cellSub}>Smallest prize first</span></div>
            <ol className={styles.catSteps}>
              {view.categories.map((cat, i) => {
                const isNext = started && !done && i === view.revealedCount;
                const isLast = i === view.categories.length - 1;
                return (
                  <li key={cat.rank}>
                    <span className={`${styles.catDot} ${cat.revealed ? styles.catDone : isNext ? styles.catNow : ""}`}>
                      {cat.revealed ? <Check size={18} aria-hidden="true" /> : isLast ? <Crown size={18} aria-hidden="true" /> : isNext ? <Radio size={18} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                    </span>
                    <div>
                      <b>{cat.name} · {cat.quantity} × {formatINR(cat.value)}</b>
                      <div className={styles.cellSub}>{cat.revealed ? `${cat.winners.length} winner${cat.winners.length === 1 ? "" : "s"} revealed` : isNext ? "Up next" : "Not revealed yet"}</div>
                      {cat.revealed && cat.winners.length > 0 && (
                        <div className={styles.winnerChips}>{cat.winners.map((w, j) => <span key={j} className={styles.winnerChip}>{w.label}</span>)}</div>
                      )}
                    </div>
                    <span>
                      {isNext && isLive && (
                        <button type="button" className={`${styles.primaryButton} ${styles.smallButton}`} disabled={busy !== ""} onClick={() => act("next", `/api/lucky-draws/draws/${draw._id}/reveal/next`)}>
                          {busy === "next" ? "Revealing…" : `Reveal ${cat.name.toLowerCase()}`}
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {done && <p className={styles.okBox}><Check size={16} aria-hidden="true" />Every prize has been revealed and every winner has an SMS with their claim code. Redeem the code at the store when they collect their prize.</p>}
          {next && started && !done && (
            <p className={styles.info}><Info size={16} aria-hidden="true" />Customers on the reveal page see each prize as you reveal it. Take your time and build up to the grand prize.</p>
          )}
          <p className={styles.info}><Lock size={16} aria-hidden="true" /><span><strong>How winners are picked.</strong> Winners are picked at random by ScratchX once, when the reveal starts, from every QR entry. Bigger bills earn more entries, and each customer can win only once.</span></p>
        </div>

        {showPreview && (
          <div className={styles.previewCol}>
            <span className={styles.modeTag}><Smartphone size={16} aria-hidden="true" />What customers see</span>
            <div className={styles.phoneFrame}>
              <iframe key={frameKey} className={styles.phoneScreen} title="Customer reveal page preview" src={`/lucky-draw/${id}/reveal`} loading="lazy" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveRevealPage() {
  return (
    <FlagGate>
      <LiveReveal />
    </FlagGate>
  );
}
