"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, Trophy, X } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import ConfirmModal from "@/components/luckyDraw/ConfirmModal";
import FieldError from "@/components/luckyDraw/FieldError";
import { focusFirstError } from "@/components/luckyDraw/focusFirstError";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeLevelLabel, formatDayTime } from "@/lib/luckyDraw/display";
import styles from "../../luckyDraws.module.css";

const maskPhone = (phone) => (phone ? `XXXXXX${String(phone).slice(-4)}` : "");
const slotId = (key) => `ld-slot-${key}`;

/** One slot per winner, grand prize first: [{ key: '1-0', rank: 1, n: 1 }, { key: '2-0', rank: 2, n: 1 }, …]. */
function slotsOf(prizeTiers) {
  return [...prizeTiers]
    .sort((a, b) => a.rank - b.rank)
    .flatMap((prize) => Array.from({ length: prize.quantity || 1 }, (_, i) => ({ key: `${prize.rank}-${i}`, rank: prize.rank, n: i + 1 })));
}

function EntrySearch({ campaignId, takenPhones, onPick, onCancel }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api(`/api/lucky-draws/campaigns/${campaignId}/entries?limit=10&q=${encodeURIComponent(q.trim())}`)
        .then((data) => {
          if (cancelled) return;
          setResults(data.entries);
          setError("");
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [campaignId, q]);

  return (
    <div className={styles.searchBox}>
      <div className={styles.searchRow}>
        <Search size={16} aria-hidden="true" />
        <input className={styles.input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Entry number, name or phone" aria-label="Search entries" />
        <button type="button" className={styles.ghostButton} onClick={onCancel} aria-label="Close search"><X size={16} aria-hidden="true" /></button>
      </div>
      {error && <p className={styles.fieldError}>{error}</p>}
      {results && results.length === 0 && <p className={styles.hint}>No entries match.</p>}
      {results && results.length > 0 && (
        <ul className={styles.results}>
          {results.map((e) => {
            const taken = takenPhones.has(e.customerPhone);
            return (
              <li key={e._id}>
                <button type="button" disabled={taken} onClick={() => onPick(e)}>
                  <span>
                    <span className={styles.mono}>#{e.entryNumber}</span> <strong>{e.customerName}</strong>{" "}
                    <span className={styles.cellSub}>{maskPhone(e.customerPhone)}{e.storeName ? ` · ${e.storeName}` : ""}</span>
                  </span>
                  <span className={styles.cellSub}>{taken ? "Already picked" : formatINR(e.billAmount)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PickWinners() {
  const { id } = useParams();
  const router = useRouter();
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [picks, setPicks] = useState({});
  const [open, setOpen] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    api(`/api/lucky-draws/campaigns/${id}`).then(setDetail).catch((err) => setLoadError(err.message));
  }, [id]);

  if (!detail) {
    return (
      <div className={styles.container}>
        {loadError ? <p className={styles.submitError} role="alert">{loadError}</p> : <p className={styles.muted}>Loading…</p>}
      </div>
    );
  }

  const { campaign, openDraw } = detail;
  const back = <Link href={`/lucky-draws/${id}`} className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />{campaign.name}</Link>;
  const stop = (message) => (
    <div className={styles.container}>
      {back}
      <p className={styles.notice}>{message}</p>
    </div>
  );
  if (campaign.drawType !== "physical") return stop("Only physical draws have their winners picked by hand.");
  if (!openDraw) return stop("The winners of this draw are already saved.");
  if (new Date(campaign.endDate) > new Date()) return stop(`You can pick the winners once entries close on ${formatDayTime(campaign.endDate)}.`);

  const prizes = [...campaign.prizeTiers].sort((a, b) => a.rank - b.rank);
  const slots = slotsOf(prizes);
  const people = openDraw.customerCount ?? 0;
  const required = Math.min(slots.length, people);
  const takenPhones = new Set(Object.values(picks).map((e) => e.customerPhone));

  const choose = (key, entry) => {
    setPicks((p) => ({ ...p, [key]: entry }));
    setOpen(null);
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };
  const change = (key) => {
    setPicks((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setOpen(key);
  };

  function review() {
    const missing = {};
    slots.slice(0, required).forEach((slot) => {
      if (!picks[slot.key]) missing[slot.key] = "Pick a winner for this prize.";
    });
    setErrors(missing);
    if (Object.keys(missing).length) {
      window.requestAnimationFrame(() => focusFirstError(missing, slotId));
      return;
    }
    setSaveError("");
    setConfirm(true);
  }

  async function saveWinners() {
    setSaving(true);
    setSaveError("");
    try {
      await api(`/api/lucky-draws/draws/${openDraw._id}/picks`, {
        method: "POST",
        body: { picks: slots.slice(0, required).map((slot) => ({ rank: slot.rank, entryId: picks[slot.key]._id })) },
      });
      router.push(`/lucky-draws/${id}?picked=1`);
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      {back}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pick winners</h1>
          <p className={styles.subtitle}>{formatNumber(openDraw.entryCount)} entries · one win per customer</p>
        </div>
      </div>

      {required === 0 && <p className={styles.notice}>Nobody entered, so there&rsquo;s no one to pick.</p>}
      {required > 0 && required < slots.length && (
        <p className={styles.notice}>
          Only {people} customer{people === 1 ? "" : "s"} entered: pick {required} winner{required === 1 ? "" : "s"} from the Grand Prize down.
        </p>
      )}

      {prizes.map((prize) => (
        <section key={prize.rank} className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {prizeLevelLabel(prize.rank)} · {prize.prizeDescription}{" "}
            <span className={styles.cellSub}>{formatNumber(prize.quantity || 1)} × {formatINR(prize.prizeValue || 0)}</span>
          </h2>
          <ul className={styles.slotList}>
            {slots.filter((slot) => slot.rank === prize.rank).map((slot) => {
              const usable = slots.indexOf(slot) < required;
              const picked = picks[slot.key];
              return (
                <li key={slot.key} className={styles.slot}>
                  <span className={styles.slotLabel}>{(prize.quantity || 1) > 1 ? `Winner ${slot.n}` : "Winner"}</span>
                  <div id={slotId(slot.key)} tabIndex={-1} className={`${styles.slotBody} ${errors[slot.key] ? styles.inputError : ""}`}>
                    {!usable ? (
                      <span className={styles.cellSub}>Not given out</span>
                    ) : picked ? (
                      <span>
                        <span className={styles.mono}>#{picked.entryNumber}</span> <strong>{picked.customerName}</strong>{" "}
                        <span className={styles.cellSub}>{maskPhone(picked.customerPhone)}{picked.storeName ? ` · ${picked.storeName}` : ""}</span>
                      </span>
                    ) : open === slot.key ? (
                      <EntrySearch campaignId={id} takenPhones={takenPhones} onPick={(entry) => choose(slot.key, entry)} onCancel={() => setOpen(null)} />
                    ) : (
                      <span className={styles.cellSub}>Not picked yet</span>
                    )}
                  </div>
                  <div className={styles.slotActions}>
                    {usable && open !== slot.key && (
                      picked ? (
                        <button type="button" className={styles.ghostButton} onClick={() => change(slot.key)}>Change</button>
                      ) : (
                        <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setOpen(slot.key)}>Choose</button>
                      )
                    )}
                  </div>
                  <FieldError message={errors[slot.key]} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {required > 0 && (
        <div className={styles.wizardFoot}>
          <Link href={`/lucky-draws/${id}`} className={styles.secondaryButton}>Cancel</Link>
          <button type="button" className={styles.primaryButton} onClick={review}><Trophy size={16} aria-hidden="true" />Save and notify winners</button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirm}
        title="Save the winners?"
        confirmLabel="Yes, save and send SMS"
        busyLabel="Saving…"
        busy={saving}
        error={saveError}
        onConfirm={saveWinners}
        onClose={() => setConfirm(false)}
      >
        <p className={styles.muted} style={{ marginTop: 0 }}>Each winner gets an SMS with a claim code. This can&rsquo;t be undone.</p>
        <ul className={styles.list}>
          {slots.slice(0, required).map((slot) => (
            <li key={slot.key}><strong>{prizeLevelLabel(slot.rank)}</strong>: #{picks[slot.key]?.entryNumber} {picks[slot.key]?.customerName}</li>
          ))}
        </ul>
      </ConfirmModal>
    </div>
  );
}

export default function PickWinnersPage() {
  return (
    <FlagGate>
      <PickWinners />
    </FlagGate>
  );
}
