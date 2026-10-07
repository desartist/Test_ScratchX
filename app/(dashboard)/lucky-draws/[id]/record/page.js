"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardList, Info } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR } from "@/lib/luckyDraw/calculator";
import { revealOrder } from "@/lib/luckyDraw/prizeCategories";
import { formatSlipNumber } from "@/lib/luckyDraw/display";
import styles from "../../luckyDraws.module.css";

/** slots[rank] = array of strings typed by the owner, one per winner. */
function initialSlots(campaign, picks) {
  const saved = new Map((picks || []).map((p) => [p.rank, p.slipNumbers]));
  return Object.fromEntries(
    campaign.prizeTiers.map((prize) => {
      const typed = (saved.get(prize.rank) || []).map((n) => formatSlipNumber(n));
      return [prize.rank, Array.from({ length: prize.quantity || 1 }, (_, i) => typed[i] || "")];
    }),
  );
}

/** Per-input problems: out of range, or a slip that already won an earlier-revealed prize. */
function findProblems(slots, order, prizes, slipCount) {
  const byRank = new Map(prizes.map((p) => [p.rank, p]));
  const wonBy = new Map();
  const problems = {};
  for (const rank of order) {
    (slots[rank] || []).forEach((value, i) => {
      if (!value) return;
      const n = Number(value);
      const key = `${rank}-${i}`;
      if (!Number.isInteger(n) || n < 1 || n > slipCount) {
        problems[key] = `Slips go from 0001 to ${formatSlipNumber(slipCount)}`;
      } else if (wonBy.has(n)) {
        problems[key] = `${formatSlipNumber(n)} already won ${wonBy.get(n)}. Draw another slip.`;
      } else {
        wonBy.set(n, byRank.get(rank).prizeDescription.toLowerCase());
      }
    });
  }
  return problems;
}

function RecordWinners() {
  const { id } = useParams();
  const router = useRouter();
  const [detail, setDetail] = useState(null);
  const [slots, setSlots] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let cancelled = false;
    api(`/api/lucky-draws/campaigns/${id}`)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setSlots(initialSlots(data.campaign, data.openDraw?.manualPicks));
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!detail) {
    return (
      <div className={styles.container}>
        {error ? <p className={styles.error} role="alert">{error}</p> : <p className={styles.muted}>Loading…</p>}
      </div>
    );
  }

  const { campaign, openDraw } = detail;
  const back = <Link href={`/lucky-draws/${id}`} className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />{campaign.name}</Link>;

  if (campaign.distributionMode !== "manual_offline_reveal" || !openDraw) {
    return (
      <div className={styles.container}>
        {back}
        <p className={styles.notice}>{campaign.distributionMode !== "manual_offline_reveal" ? "Winning slips are only typed in for draws revealed in the store." : "The winners for this draw have already been published."}</p>
      </div>
    );
  }

  const order = revealOrder(campaign.prizeTiers);
  const byRank = new Map(campaign.prizeTiers.map((p) => [p.rank, p]));
  const problems = findProblems(slots, order, campaign.prizeTiers, campaign.slipCount || 0);
  const needed = campaign.prizeTiers.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const entered = Object.values(slots).flat().filter(Boolean).length;
  const hasProblems = Object.keys(problems).length > 0;
  const entriesOpen = new Date(campaign.endDate) > new Date();

  const setSlot = (rank, index, value) =>
    setSlots((s) => ({ ...s, [rank]: s[rank].map((v, i) => (i === index ? value.replace(/[^\d]/g, "").slice(0, 7) : v)) }));
  const picks = () =>
    order.map((rank) => ({ rank, slipNumbers: (slots[rank] || []).filter(Boolean).map(Number) }));

  async function save(publish) {
    setBusy(publish ? "publish" : "save");
    setError("");
    setNotice("");
    try {
      await api(`/api/lucky-draws/draws/${openDraw._id}/picks`, { method: "PUT", body: { picks: picks() } });
      if (publish) {
        await api(`/api/lucky-draws/draws/${openDraw._id}/publish`, { method: "POST" });
        router.push(`/lucky-draws/${id}`);
        return;
      }
      setNotice("Saved. Nothing is public until you publish the winners.");
    } catch (err) {
      setError(err.message);
    }
    setBusy("");
  }

  return (
    <div className={styles.container}>
      {back}
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.title} ${styles.titleRow}`}>Record winners<span className={`${styles.pill} ${styles.pill_due}`}>Draw day</span></h1>
          <p className={styles.subtitle}><span className={styles.modeTag}><ClipboardList size={15} aria-hidden="true" />Manual, in-store reveal</span> · Slips 0001 to {formatSlipNumber(campaign.slipCount || 0)} were handed out</p>
        </div>
      </div>

      <p className={styles.info}><Info size={16} aria-hidden="true" />Pick slips from the box in front of your customers, smallest prize first. Type each winning slip number below, then publish the winners.</p>
      {entriesOpen && <p className={styles.notice}>Entries are still open until {new Date(campaign.endDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. You can save slips now, but publish only after entries close.</p>}
      {!campaign.slipCount && <p className={styles.notice}>No slips are recorded yet. Update the number of slips handed out on the draw&rsquo;s page first.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}

      <form className={styles.panel} onSubmit={(e) => { e.preventDefault(); save(true); }}>
        {order.map((rank) => {
          const prize = byRank.get(rank);
          const filled = (slots[rank] || []).filter(Boolean).length;
          const qty = prize.quantity || 1;
          return (
            <div key={rank} className={styles.catBlock}>
              <div className={styles.catHead}>
                <h2 className={styles.sectionTitle}>{prize.prizeDescription} <span className={styles.muted} style={{ fontWeight: 500 }}>· {qty} × {formatINR(prize.prizeValue || 0)}</span></h2>
                {filled === qty ? (
                  <span className={styles.countOk}><CheckCircle2 size={16} aria-hidden="true" />{filled} of {qty} entered</span>
                ) : (
                  <span className={styles.countMiss}><AlertCircle size={16} aria-hidden="true" />{filled} of {qty} entered</span>
                )}
              </div>
              <div className={styles.slotGrid}>
                {(slots[rank] || []).map((value, i) => {
                  const problem = problems[`${rank}-${i}`];
                  return (
                    <div key={i} className={styles.field}>
                      <label className={styles.hint} htmlFor={`slot-${rank}-${i}`}>{qty === 1 ? "Winner" : `Winner ${i + 1}`}</label>
                      <input
                        id={`slot-${rank}-${i}`}
                        className={`${styles.input} ${styles.slotInput} ${problem ? styles.inputError : ""}`}
                        inputMode="numeric"
                        placeholder="Slip no."
                        value={value}
                        onChange={(e) => setSlot(rank, i, e.target.value)}
                        aria-invalid={!!problem}
                        aria-describedby={problem ? `slot-err-${rank}-${i}` : undefined}
                      />
                      {problem && <p className={styles.fieldError} id={`slot-err-${rank}-${i}`}>{problem}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className={styles.stickyBar}>
          <p className={styles.muted}><b style={{ color: "#010f44" }}>{entered} of {needed} winners entered.</b> {hasProblems ? "Fix the highlighted slips to continue." : entered < needed ? "Enter every winning slip to publish." : "Ready to publish."}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} disabled={busy !== "" || hasProblems} onClick={() => save(false)}>{busy === "save" ? "Saving…" : "Save for later"}</button>
            <button type="submit" className={styles.primaryButton} disabled={busy !== "" || hasProblems || entered < needed || entriesOpen}>{busy === "publish" ? "Publishing…" : "Publish winners"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function RecordWinnersPage() {
  return (
    <FlagGate>
      <RecordWinners />
    </FlagGate>
  );
}
