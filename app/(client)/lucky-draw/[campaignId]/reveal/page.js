"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Crown, Gift, Lock, Sparkles } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR } from "@/lib/luckyDraw/calculator";
import { formatDayTime } from "@/lib/luckyDraw/display";
import styles from "./reveal.module.css";

const POLL_LIVE_MS = 4000;
const POLL_WAITING_MS = 20000;
// Matches the foil wipe in reveal.module.css: each card starts 380 ms after the previous one.
const FOIL_STEP_MS = 380;
const FOIL_MS = 900;

const pad = (n) => String(n).padStart(2, "0");

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Time left until `target`, ticking every second while `active`. Null until mounted (keeps SSR markup stable). */
function useCountdown(target, active) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [active]);
  if (!active || now === null || !target) return null;
  const left = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(left / 1000);
  return { done: left === 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

function Countdown({ left }) {
  if (!left) return null;
  if (left.done) {
    return <p className={styles.soon}><span className={styles.soonDot} aria-hidden="true" />The store is about to start the reveal</p>;
  }
  const units = [
    ...(left.days ? [["days", left.days]] : []),
    ["hrs", left.hours],
    ["min", left.minutes],
    ["sec", left.seconds],
  ];
  return (
    <div className={styles.countdown} role="timer" aria-label="Time until the reveal">
      {units.map(([label, value]) => (
        <span key={label} className={styles.tick}>
          <b>{label === "days" ? value : pad(value)}</b>
          <small>{label}</small>
        </span>
      ))}
    </div>
  );
}

function PrizeArt({ category, isGrand, size = "large" }) {
  const Icon = isGrand ? Crown : Gift;
  return category.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={size === "large" ? styles.heroArt : styles.rungArt} src={category.imageUrl} alt={size === "large" ? category.name : ""} />
  ) : (
    <span className={size === "large" ? styles.heroArt : styles.rungArt} aria-hidden="true"><Icon size={size === "large" ? 44 : 18} /></span>
  );
}

function RevealStage() {
  const { campaignId } = useParams();
  const reducedMotion = useReducedMotion();
  const [view, setView] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [fresh, setFresh] = useState(new Set());
  const [announcement, setAnnouncement] = useState("");
  const seen = useRef(null);
  const confettiFired = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/customer/lucky-draw/campaigns/${campaignId}/reveal`);
      setError("");
      setView(data);
      const revealed = data.categories.filter((c) => c.revealed).map((c) => c.rank);
      // Prizes revealed since the last look get the scratch-off moment and take the spotlight.
      if (seen.current) {
        const newly = revealed.filter((rank) => !seen.current.has(rank));
        if (newly.length) {
          const latest = data.categories.find((c) => c.rank === newly[newly.length - 1]);
          setFresh(new Set(newly));
          setSelected(latest.rank);
          setAnnouncement(`${latest.name} revealed: ${latest.winners.map((w) => w.label).join(", ") || "no winners"}.`);
        }
      } else {
        const upNext = data.categories[data.revealedCount];
        setSelected(revealed.length ? revealed[revealed.length - 1] : upNext?.rank ?? data.categories[0]?.rank ?? null);
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

  const left = useCountdown(view?.revealDate, view?.status === "not_started");

  const grandRank = view?.categories[view.categories.length - 1]?.rank;
  const category = view ? view.categories.find((c) => c.rank === selected) || view.categories[0] : null;
  const freshHere = category && fresh.has(category.rank);

  // Confetti once the foil has come off the last card of a newly revealed prize; bigger for the grand prize.
  // Fires at most once per rank: `view` (and so `category`) is a new object on every poll, which would
  // otherwise re-run this effect and burst confetti again each poll while the prize stays selected.
  useEffect(() => {
    if (!freshHere || reducedMotion || !category.winners.length) return undefined;
    if (confettiFired.current.has(category.rank)) return undefined;
    let cancelled = false;
    const delay = 200 + (category.winners.length - 1) * FOIL_STEP_MS + FOIL_MS;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      confettiFired.current.add(category.rank);
      const { default: confetti } = await import("canvas-confetti");
      if (cancelled) return;
      const colors = ["#ef9e1b", "#f6c35a", "#fff4d6", "#ffffff", "#6f86ff"];
      const grand = category.rank === grandRank;
      confetti({ particleCount: grand ? 160 : 90, spread: grand ? 110 : 80, startVelocity: grand ? 52 : 40, origin: { y: 0.35 }, colors, scalar: 1.05 });
      if (grand) {
        setTimeout(() => {
          confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors });
          confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors });
        }, 350);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [freshHere, reducedMotion, category, grandRank]);

  const ladder = useMemo(() => view?.categories || [], [view]);
  const ladderRef = useRef(null);

  // Keep the selected prize in view on the swipeable phone row (no-op when the ladder is a column).
  useEffect(() => {
    const row = ladderRef.current;
    const rung = row?.querySelector('[aria-pressed="true"]');
    if (!rung || row.scrollWidth <= row.clientWidth) return;
    const box = row.getBoundingClientRect();
    const chip = rung.getBoundingClientRect();
    const gutter = 16;
    const delta = chip.right > box.right - gutter ? chip.right - box.right + gutter : chip.left < box.left + gutter ? chip.left - box.left - gutter : 0;
    if (delta) row.scrollBy({ left: delta, behavior: reducedMotion ? "auto" : "smooth" });
  }, [selected, reducedMotion, view]);

  if (error && !view) {
    return (
      <div className={styles.page}>
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.shell}><p className={styles.error} role="alert">{error}</p></div>
      </div>
    );
  }
  if (!view) {
    return (
      <div className={styles.page}>
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.shell}><p className={styles.sub}>Loading…</p></div>
      </div>
    );
  }

  const nextUp = view.categories[view.revealedCount];
  const isGrand = category?.rank === grandRank;
  const progress = view.totalCategories ? view.revealedCount / view.totalCategories : 0;

  return (
    <div className={`${styles.page} ${view.status === "live" ? styles.isLive : ""}`}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.top}>
          <span className={styles.stores}>{view.storeNames.join(" · ")}</span>
          {view.status === "live" && <span className={styles.badge}><span className={styles.liveDot} aria-hidden="true" />Live</span>}
          {view.status === "done" && <span className={`${styles.badge} ${styles.badgeDone}`}><Sparkles size={13} aria-hidden="true" />Results</span>}
        </header>

        <div className={styles.head}>
          <h1 className={styles.title}>{view.name}</h1>
          {view.status === "not_started" && (
            <>
              <p className={styles.sub}>Winners are revealed on {formatDayTime(view.revealDate)}. Keep this page open.</p>
              <Countdown left={left} />
            </>
          )}
          {view.status !== "not_started" && (
            <div className={styles.progressRow}>
              <p className={styles.sub}>
                {view.status === "live"
                  ? `${view.revealedCount} of ${view.totalCategories} prizes revealed${nextUp ? ` · Next: ${nextUp.name}` : ""}`
                  : "Every prize has been revealed. Congratulations to the winners!"}
              </p>
              <span className={styles.meter} aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></span>
            </div>
          )}
        </div>

        <div className={styles.stage}>
          <nav ref={ladderRef} className={styles.ladder} aria-label="Prizes, Third Prize first">
            {ladder.map((c) => {
              const isNext = view.status === "live" && nextUp?.rank === c.rank;
              const grand = c.rank === grandRank;
              return (
                <button
                  key={c.rank}
                  type="button"
                  aria-pressed={c.rank === category?.rank}
                  className={`${styles.rung} ${c.rank === category?.rank ? styles.rungOn : ""} ${c.revealed ? styles.rungDone : ""} ${isNext ? styles.rungNext : ""} ${grand ? styles.rungGrand : ""}`}
                  onClick={() => setSelected(c.rank)}
                >
                  <PrizeArt category={c} isGrand={grand} size="small" />
                  <span className={styles.rungText}>
                    <b>{c.level}</b>
                    <span>{c.name} · {formatINR(c.value)}</span>
                  </span>
                  <span className={styles.rungState} aria-hidden="true">
                    {c.revealed ? <Check size={15} /> : isNext ? <span className={styles.nextDot} /> : <Lock size={13} />}
                  </span>
                  <span className={styles.srOnly}>{c.revealed ? "revealed" : isNext ? "up next" : "not revealed yet"}</span>
                </button>
              );
            })}
          </nav>

          {category && (
            <section key={category.rank} className={`${styles.spotlight} ${isGrand ? styles.spotlightGrand : ""} ${freshHere ? styles.spotlightFresh : ""}`} aria-labelledby="prize-name">
              <div className={styles.hero}>
                <PrizeArt category={category} isGrand={isGrand} />
                <div className={styles.heroText}>
                  <h2 id="prize-name" className={styles.prizeName}>
                    {category.name}
                    {isGrand && <span className={styles.grandTag}><Crown size={14} aria-hidden="true" />Grand Prize</span>}
                  </h2>
                  <p className={styles.prizeValue}>{formatINR(category.value)}<small>{category.quantity > 1 ? `each · ${category.quantity} winners` : "1 winner"}</small></p>
                </div>
              </div>

              {category.revealed ? (
                category.winners.length ? (
                  <ul className={`${styles.winners} ${category.winners.length === 1 ? styles.winnersSolo : ""}`}>
                    {category.winners.map((w, i) => (
                      <li key={`${w.label}-${i}`} className={`${styles.win} ${freshHere && !reducedMotion ? styles.foil : ""}`} style={{ "--i": i }}>
                        <b>{w.label}</b>
                        {w.sub && <small>{w.sub}</small>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.sub}>Nobody was eligible for this prize.</p>
                )
              ) : (
                <div className={`${styles.locked} ${view.status === "live" && nextUp?.rank === category.rank ? styles.lockedNext : ""}`}>
                  <span className={styles.lockRing}><Lock size={26} aria-hidden="true" /></span>
                  <b>{view.status === "not_started" ? "Not revealed yet" : nextUp?.rank === category.rank ? "Up next" : "Revealed later"}</b>
                  <span>The Third Prize is revealed first, then the Second Prize, and the Grand Prize last. Stay on this page.</span>
                </div>
              )}
            </section>
          )}
        </div>

        <p className={styles.srOnly} aria-live="polite">{announcement}</p>
        <p className={styles.foot}>{view.drawType === "physical" ? "Winners were drawn in the store. Each customer can win only once." : "Winners are picked at random by ScratchX from every entry. Each customer can win only once."}</p>
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
