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
  const slipOnline = campaign.distributionMode === "manual_online_reveal";
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
            {draw ? ` · ${formatNumber(draw.entryCount)} ${slipOnline ? "slips" : "entries"} in the draw` : campaign.slipCount ? ` · ${formatNumber(campaign.slipCount)} slips handed out` : ""}
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={copy}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? "Copied" : "Copy watch link"}</button>
          <a className={styles.secondaryButton} href={`/lucky-draw/${id}/reveal`} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Open reveal page</a>
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.detailGrid} style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}>
        <div className={styles.stack}>
          {!started && slipOnline && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ready when you are</h2>
              <p className={styles.muted}>
                Share the watch link with your customers, then start. ScratchX picks the winning slips at random from slips 0001 to {String(campaign.slipCount || 0).padStart(4, "0")}. Nothing is shown until you reveal each prize.
              </p>
              {entriesOpen && <p className={styles.notice}>Entries are open until {formatDayTime(campaign.endDate)}. You can start the reveal after that.</p>}
              {!campaign.slipCount && <p className={styles.notice}>Record how many slips were handed out on the draw&rsquo;s page first.</p>}
              <div>
                <button type="button" className={styles.primaryButton} disabled={busy !== "" || entriesOpen || !campaign.slipCount || !openDraw} onClick={() => act("start", `/api/lucky-draws/draws/${openDraw._id}/reveal/start`)}>
                  <Play size={16} aria-hidden="true" />{busy === "start" ? "Picking winners…" : "Start live reveal"}
                </button>
              </div>
            </section>
          )}

          {!slipOnline && !started && (
            <p className={styles.notice}>Results appear here once the draw has run.</p>
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
                      {isNext && slipOnline && (
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

          {done && <p className={styles.okBox}><Check size={16} aria-hidden="true" />Every prize has been revealed. Winners show their slip at the store to collect; mark each one as claimed on the draw&rsquo;s page.</p>}
          {next && started && !done && (
            <p className={styles.info}><Info size={16} aria-hidden="true" />Customers on the reveal page see each prize as you reveal it. Take your time and build up to the grand prize.</p>
          )}
          <p className={styles.info}><Lock size={16} aria-hidden="true" /><span><strong>How winners are picked.</strong> Winners are picked at random by ScratchX once, when the reveal starts, and stored. Each slip can win only once.</span></p>
        </div>

        <div className={styles.stack} style={{ alignItems: "center" }}>
          <span className={styles.modeTag}><Smartphone size={16} aria-hidden="true" />What customers see</span>
          <div style={{ width: "100%", maxWidth: 360, borderRadius: 36, padding: 10, background: "#0b0f1f", boxShadow: "0 30px 60px -20px rgba(1,15,68,0.45)" }}>
            <iframe key={frameKey} title="Customer reveal page preview" src={`/lucky-draw/${id}/reveal`} style={{ width: "100%", height: 640, border: 0, borderRadius: 28, background: "#050d33" }} />
          </div>
        </div>
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
