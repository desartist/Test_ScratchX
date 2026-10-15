"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarPlus, CheckCircle2, Clock, Eye, Gift, Plus, QrCode, Radio, Send, Store, Ticket, Trophy, X } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import AddEntryModal from "@/components/luckyDraw/AddEntryModal";
import ConfirmModal from "@/components/luckyDraw/ConfirmModal";
import { api, formatDateTime, istInputToIso, pluralEntries, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { DATE_CHANGE_NOTICE, STAFF_ENTRY_DRAW_TYPES } from "@/lib/luckyDraw/constants";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeTotals, revealOrder } from "@/lib/luckyDraw/prizeCategories";
import { DRAW_TYPE_LABEL, PRIZE_LEVEL_LABEL, daysUntil, describeMinBill, drawStage, formatDay, formatDayTime, pluralDays, timelinePosition } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

const DRAW_ICON = { physical: Store, live_online: Radio, digital: QrCode };
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_LABEL = { entries_close: "Entries close moved", reveal: "Draw date moved", draw: "Draw date changed" };
const REVEAL_POSITION = ["Revealed first", "Revealed second", "Revealed last"];
const maskPhone = (phone) => (phone ? `XXXXXX${String(phone).slice(-4)}` : "");
const winnerStatus = (w) => (w.status === "redeemed" ? "claimed" : w.status === "expired" ? "expired" : "pending");
const WINNER_LABEL = { claimed: "Claimed", pending: "Not claimed", expired: "Expired" };

function ExtendPanel({ campaign, openDraw, onClose, onSaved }) {
  const closeDate = new Date(campaign.endDate);
  const revealDate = new Date(openDraw?.drawDate || campaign.revealDate || campaign.endDate);
  const entriesClosed = closeDate <= new Date();
  const [target, setTarget] = useState(entriesClosed ? "reveal" : "entries_close");
  const [days, setDays] = useState(entriesClosed ? 1 : 7);
  const [custom, setCustom] = useState("");
  const [notify, setNotify] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const current = target === "entries_close" ? closeDate : revealDate;
  const newDate = days ? new Date(current.getTime() + days * DAY_MS) : custom ? new Date(istInputToIso(custom) || NaN) : null;
  const validNew = newDate && !Number.isNaN(newDate.getTime()) && newDate > current;
  const gap = Math.max(0, revealDate - closeDate);
  const revealMoves = target === "entries_close" && validNew && newDate > revealDate;
  const movedReveal = revealMoves ? new Date(newDate.getTime() + gap) : null;

  async function save() {
    if (!validNew) {
      setError("Pick a date later than the current one.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await api(`/api/lucky-draws/campaigns/${campaign._id}/dates`, {
        method: "PATCH",
        body: { target, newDate: newDate.toISOString(), reason, notifyEntrants: notify },
      });
      onSaved(result);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <section className={`${styles.panel} ${styles.extendPanel}`} aria-labelledby="extend-title">
      <div className={styles.panelHead}>
        <h2 className={styles.sectionTitle} id="extend-title" style={{ display: "flex", gap: 10, alignItems: "center" }}><CalendarPlus size={18} aria-hidden="true" />Extend dates</h2>
        <button type="button" className={styles.ghostButton} aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
      <div className={styles.panelBody}>
        {error && <p className={styles.submitError} role="alert">{error}</p>}
        <div className={styles.extRow}>
          <span className={styles.label}>What to extend</span>
          <div className={styles.seg} role="radiogroup" aria-label="What to extend">
            <button type="button" role="radio" aria-checked={target === "entries_close"} disabled={entriesClosed} className={`${styles.segButton} ${target === "entries_close" ? styles.segOn : ""}`} onClick={() => { setTarget("entries_close"); setDays(7); setCustom(""); }}>Entries close</button>
            <button type="button" role="radio" aria-checked={target === "reveal"} className={`${styles.segButton} ${target === "reveal" ? styles.segOn : ""}`} onClick={() => { setTarget("reveal"); setDays(3); setCustom(""); }}>Draw date</button>
          </div>
        </div>
        {entriesClosed && <p className={styles.hint}>Entries have already closed, so only the draw date can move.</p>}
        <div className={styles.extRow}>
          <span className={styles.label}>Now</span>
          <span className={styles.modeTag}><Clock size={16} aria-hidden="true" /><b style={{ color: "#010f44" }}>{formatDayTime(current)}</b> · {pluralDays(daysUntil(current))} left</span>
        </div>
        <div className={styles.extRow} style={{ alignItems: "start" }}>
          <span className={styles.label} style={{ paddingTop: 8 }}>Extend by</span>
          <div className={styles.field}>
            <div className={styles.chips}>
              {[1, 3, 7].map((n) => (
                <button key={n} type="button" aria-pressed={days === n} className={`${styles.chipButton} ${days === n ? styles.chipOn : ""}`} onClick={() => { setDays(n); setCustom(""); }}>{pluralDays(n)}</button>
              ))}
              <button type="button" aria-pressed={!days} className={`${styles.chipButton} ${!days ? styles.chipOn : ""}`} onClick={() => { setDays(0); setCustom(toISTInputValue(new Date(current.getTime() + DAY_MS))); }}>Pick a date</button>
            </div>
            {!days && (
              <input type="datetime-local" aria-label="New date and time (IST)" className={styles.input} style={{ maxWidth: 260 }} value={custom} onChange={(e) => setCustom(e.target.value)} />
            )}
            <p className={styles.hint}>New date: <b style={{ color: "#010f44" }}>{validNew ? formatDayTime(newDate) : "pick a later date"}</b></p>
          </div>
        </div>
        {revealMoves && (
          <div className={styles.warn}><AlertTriangle size={18} aria-hidden="true" /><span><strong>The draw date moves too, to {formatDayTime(movedReveal)}.</strong> The draw can only happen after entries close, so the same gap is kept.</span></div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="extend-reason">Reason (optional, kept in the history)</label>
          <input id="extend-reason" className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Festival week sales are strong" />
        </div>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <span>Tell the {openDraw?.customerCount ?? 0} customer{openDraw?.customerCount === 1 ? "" : "s"} who already entered by SMS</span>
        </label>
        <p className={styles.hint}>Dates can only move later. The change is saved in the draw&rsquo;s history.</p>
      </div>
      <div className={styles.panelFoot}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.primaryButton} disabled={saving || !validNew} onClick={save}>{saving ? "Saving…" : "Save new dates"}</button>
      </div>
    </section>
  );
}

function ClaimButton({ winner, onClaimed }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function claim() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/lucky-draws/winners/${winner._id}/claim`, { method: "PATCH", body: {} });
      onClaimed();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={claim} disabled={busy}>{busy ? "Saving…" : "Mark as claimed"}</button>
      {error && <p className={styles.fieldError} role="alert">{error}</p>}
    </>
  );
}

function EntriesPanel({ campaignId, refreshKey, canAdd, onAdd }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api(`/api/lucky-draws/campaigns/${campaignId}/entries`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, refreshKey]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.sectionTitle}>Entries{data ? ` · ${formatNumber(data.total)}` : ""}</h2>
        {canAdd && <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={onAdd}><Plus size={15} aria-hidden="true" />Add entry</button>}
      </div>
      {error && <p className={styles.submitError} role="alert" style={{ margin: "12px 22px" }}>{error}</p>}
      {data && data.entries.length === 0 && <p className={styles.muted} style={{ padding: "18px 22px" }}>No entries yet.</p>}
      {data && data.entries.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>#</th><th>Customer</th><th className={styles.num}>Bill</th><th>Added by</th><th>Store</th><th>When</th></tr></thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={e._id}>
                  <td className={styles.mono} style={{ whiteSpace: "nowrap" }}>#{e.entryNumber}</td>
                  <td><strong>{e.customerName}</strong><span className={styles.cellSub}>{maskPhone(e.customerPhone)}</span></td>
                  <td className={styles.num}>{formatINR(e.billAmount)}</td>
                  <td>{e.source === "staff" ? "Staff" : "QR scan"}</td>
                  <td>{e.storeName || "—"}</td>
                  <td>{formatDayTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.entries.length > 0 && (
        <ul className={styles.entryCards}>
          {data.entries.map((e) => (
            <li key={e._id} className={styles.entryCard}>
              <span className={styles.mono}>#{e.entryNumber}</span>
              <span className={styles.entryCardMain}>
                <strong>{e.customerName}</strong>
                <span className={styles.cellSub}>{maskPhone(e.customerPhone)} · {e.source === "staff" ? "Staff" : "QR scan"}{e.storeName ? ` · ${e.storeName}` : ""}</span>
                <span className={styles.cellSub}>{formatDayTime(e.createdAt)}</span>
              </span>
              <strong className={styles.num}>{formatINR(e.billAmount)}</strong>
            </li>
          ))}
        </ul>
      )}
      {data && data.total > data.entries.length && <p className={styles.hint} style={{ padding: "10px 22px" }}>Showing the latest {data.entries.length} entries.</p>}
    </div>
  );
}

function LuckyDrawDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(null);
  const [showExtend, setShowExtend] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [runError, setRunError] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entriesKey, setEntriesKey] = useState(0);
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [arrival, setArrival] = useState(null);
  const [now, setNow] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/lucky-draws/campaigns/${id}`);
      setDetail(data);
      setNow(new Date());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("published")) setArrival({ kind: "published" });
    else if (params.get("picked")) setArrival({ kind: "picked" });
    else if (params.get("notPublished")) setArrival({ kind: "draft", message: params.get("notPublished") });
  }, [load]);

  async function perform(label, action) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  const winners = useMemo(() => detail?.winners || [], [detail]);
  const shownWinners = winnerFilter === "all" ? winners : winners.filter((w) => winnerStatus(w) === winnerFilter);

  if (!detail) {
    return (
      <div className={styles.container}>
        {error ? <p className={styles.submitError} role="alert">{error}</p> : <p className={styles.muted}>Loading…</p>}
        <Link href="/lucky-draws" className={styles.secondaryButton}>Back to lucky draws</Link>
      </div>
    );
  }

  const { campaign, openDraw, pastDraws } = detail;
  const drawType = campaign.drawType;
  const DrawIcon = DRAW_ICON[drawType] || Trophy;
  const latestReveal = pastDraws[0]?.reveal;
  const revealInProgress = !!latestReveal?.startedAt && !latestReveal?.completedAt;
  const today = now || new Date();
  const stage = drawStage({ ...campaign, revealInProgress }, { now: today, openDraw });
  const reveal = new Date(openDraw?.drawDate || campaign.revealDate || pastDraws[0]?.executedAt || campaign.endDate);
  const pos = timelinePosition({ start: campaign.startDate, close: campaign.endDate, reveal, now: today });
  const totals = prizeTotals(campaign.prizeTiers);
  const order = revealOrder(campaign.prizeTiers);
  const prizes = [...campaign.prizeTiers].sort((a, b) => a.rank - b.rank);
  const canExtend = campaign.status !== "ended" && !openDraw?.reveal?.startedAt && (openDraw || campaign.status === "draft");
  const entriesClosed = new Date(campaign.endDate) <= today;
  const entriesStarted = campaign.status === "active" && new Date(campaign.startDate) <= today;
  const entriesOpen = entriesStarted && !entriesClosed;
  const canAddEntries = STAFF_ENTRY_DRAW_TYPES.includes(drawType) && entriesOpen;
  const latestDraw = pastDraws[0];
  const history = [...(openDraw?.dateHistory || [])].reverse();
  const daysLeft = daysUntil(entriesClosed ? reveal : campaign.endDate, today);
  const countdown = stage.key === "completed" ? "Done" : stage.key === "live" ? "Live now" : stage.key === "due" ? "Now" : daysLeft === 0 ? "Today" : pluralDays(daysLeft);
  const counts = { all: winners.length, pending: winners.filter((w) => winnerStatus(w) === "pending").length, claimed: winners.filter((w) => winnerStatus(w) === "claimed").length };
  const entryDraw = {
    _id: campaign._id,
    name: campaign.name,
    minBillAmount: campaign.minBillAmount,
    stores: campaign.assignedStores.filter((s) => s.status === "active").map((s) => ({ storeId: s.storeId, storeName: s.storeName })),
  };
  const ranLabel = latestDraw?.triggeredBy?.source === "picked" ? "Winners picked in the shop" : drawType === "live_online" ? "Winners picked for the live reveal" : "Draw ran";

  const setStatus = (status) => perform("status", () => api(`/api/lucky-draws/campaigns/${id}/status`, { method: "PATCH", body: { status } }));
  const showQr = () => perform("qr", async () => setQr(await api(`/api/lucky-draws/campaigns/${id}/qr`)));

  async function runNow() {
    setBusy("run");
    setRunError("");
    try {
      const result = await api(`/api/lucky-draws/draws/${openDraw._id}/run`, { method: "POST" });
      setShowRun(false);
      const unawarded = totals.totalWinners - result.winners.length;
      setNotice(
        `Draw complete: ${result.winners.length} winner${result.winners.length === 1 ? "" : "s"} picked, ${result.notified.sent} told by SMS.` +
          (unawarded > 0 ? ` ${unawarded} prize${unawarded === 1 ? "" : "s"} could not be given out because not enough customers entered.` : ""),
      );
      await load();
    } catch (err) {
      setRunError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className={styles.container}>
      <Link href="/lucky-draws" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />All lucky draws</Link>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.title} ${styles.titleRow}`}>{campaign.name}<span className={`${styles.pill} ${styles[`pill_${stage.tone}`]}`}>{stage.label}</span></h1>
          <p className={styles.subtitle}>
            <span className={styles.modeTag}><DrawIcon size={15} aria-hidden="true" />{DRAW_TYPE_LABEL[drawType]}</span> · {describeMinBill(campaign.minBillAmount)} · {campaign.assignedStores.map((s) => s.storeName).join(", ")}
          </p>
        </div>
        <div className={styles.actions}>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <button className={styles.primaryButton} disabled={busy === "status"} onClick={() => setStatus("active")}><Send size={16} aria-hidden="true" />{campaign.status === "draft" ? "Publish" : "Resume entries"}</button>
          )}
          {canAddEntries && <button className={styles.primaryButton} onClick={() => setShowAddEntry(true)}><Plus size={16} aria-hidden="true" />Add entry</button>}
          {campaign.status === "active" && !entriesClosed && (
            <button className={styles.secondaryButton} disabled={busy === "status"} onClick={() => setStatus("paused")}>Pause entries</button>
          )}
          {drawType !== "physical" && <button className={styles.secondaryButton} disabled={busy === "qr"} onClick={showQr}><QrCode size={16} aria-hidden="true" />QR code</button>}
          <a className={styles.secondaryButton} href={`/lucky-draw/${id}/reveal`} target="_blank" rel="noreferrer"><Eye size={16} aria-hidden="true" />Results page</a>
          {canExtend && <button className={styles.navyButton} onClick={() => setShowExtend(true)}><CalendarPlus size={16} aria-hidden="true" />Extend dates</button>}
        </div>
      </div>

      {arrival?.kind === "published" && (
        <div className={styles.okBox} role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>
            <strong>Your lucky draw is published.</strong>{" "}
            {drawType === "physical"
              ? `Staff can add entries at the counter from ${formatDayTime(campaign.startDate)}. Hold the draw in your shop on ${formatDayTime(reveal)}.`
              : `Put the QR code at your counters so customers can enter from ${formatDayTime(campaign.startDate)}. Winners are drawn on ${formatDayTime(reveal)}.`}
          </span>
        </div>
      )}
      {arrival?.kind === "picked" && (
        <div className={styles.okBox} role="status"><CheckCircle2 size={18} aria-hidden="true" /><span><strong>Winners saved.</strong> Each winner has an SMS with their claim code. Mark prizes as claimed below when winners collect them.</span></div>
      )}
      {arrival?.kind === "draft" && (
        <p className={styles.notice} role="status"><strong>Saved as a draft.</strong> It could not be published yet: {arrival.message}</p>
      )}
      {error && <p className={styles.submitError} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}

      {showExtend && (
        <ExtendPanel
          campaign={campaign}
          openDraw={openDraw}
          onClose={() => setShowExtend(false)}
          onSaved={async (result) => {
            setShowExtend(false);
            const moved = result.revealMoved ? ` The draw is now on ${formatDayTime(result.draw?.drawDate || result.campaign.revealDate)}.` : "";
            setNotice(`Dates updated. Entries close on ${formatDayTime(result.campaign.endDate)}.${moved}${result.notifiedCount ? ` ${result.notifiedCount} customers were told by SMS.` : ""}`);
            await load();
          }}
        />
      )}

      {qr && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Customer QR code</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.qr} src={qr.dataUrl} alt="QR code for the lucky draw entry page" />
          <p className={styles.muted}>Customers scan this in the store. Link: <span className={styles.mono}>{qr.url}</span></p>
          <div><a className={styles.secondaryButton} href={qr.dataUrl} download={`lucky-draw-${id}.png`}>Download PNG</a></div>
        </section>
      )}

      <div className={styles.detailGrid}>
        <div className={styles.stack}>
          <div className={styles.panel}>
            <div className={styles.panelBody} style={{ paddingBottom: 18 }}>
              <h2 className={styles.sectionTitle}>Timeline</h2>
              <div className={styles.timeline}>
                <div className={styles.tlTrack}>
                  <span className={styles.tlFill} style={{ width: `${Math.min(pos.today, pos.close)}%` }} />
                  <span className={styles.tlWait} style={{ left: `${pos.close}%` }} />
                  <span className={styles.tlNode} style={{ left: 0 }} />
                  {stage.key !== "completed" && stage.key !== "draft" && <span className={styles.tlToday} style={{ left: `${pos.today}%` }}>Today</span>}
                  <span className={styles.tlNode} style={{ left: `${pos.close}%` }} />
                  <span className={`${styles.tlNode} ${styles.tlReveal}`} style={{ left: "100%" }} />
                </div>
                <div className={styles.tlLegend}>
                  <div><small>Entries open</small><b>{formatDayTime(campaign.startDate)}</b></div>
                  <div><small>Entries close</small><b>{formatDayTime(campaign.endDate)}</b></div>
                  <div><small>Draw date</small><b>{formatDayTime(reveal)}</b></div>
                </div>
              </div>
            </div>
            <dl className={styles.statStrip}>
              <div><dt>Entries</dt><dd>{formatNumber(openDraw?.entryCount ?? latestDraw?.entryCount ?? 0)}</dd></div>
              <div><dt>Customers</dt><dd>{formatNumber(openDraw?.customerCount ?? latestDraw?.customerCount ?? 0)}</dd></div>
              <div><dt>{entriesClosed ? "Draw in" : "Entries close in"}</dt><dd>{countdown}</dd></div>
              <div><dt>Prize pool</dt><dd>{formatINR(totals.totalValue)}</dd></div>
            </dl>
          </div>

          {campaign.status !== "draft" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{stage.key === "completed" ? "Draw" : "Draw day"}</h2>
              {drawType === "physical" && openDraw && (
                <>
                  <p className={styles.muted}>Hold the draw in your shop on {formatDayTime(openDraw.drawDate)}. Then pick each winner here from the entry list. Each winner gets an SMS with a claim code.</p>
                  {entriesClosed ? (
                    <div><Link href={`/lucky-draws/${id}/pick`} className={styles.primaryButton}><Trophy size={16} aria-hidden="true" />Pick winners</Link></div>
                  ) : (
                    <p className={styles.notice}>You can pick the winners once entries close on {formatDayTime(campaign.endDate)}.</p>
                  )}
                </>
              )}
              {drawType === "live_online" && (
                <>
                  <p className={styles.muted}>On the draw date you start the reveal. ScratchX picks the winners at random from every entry, and you reveal the Third Prize, then the Second Prize, then the Grand Prize while customers watch the results page.</p>
                  <div className={styles.actions}>
                    <Link href={`/lucky-draws/${id}/live`} className={styles.primaryButton}><Radio size={16} aria-hidden="true" />{latestDraw?.reveal?.completedAt ? "See the reveal" : "Go to live reveal"}</Link>
                  </div>
                </>
              )}
              {drawType === "digital" && openDraw && (
                <>
                  <p className={styles.muted}>Nothing happens by itself. Press Run draw when you are ready{openDraw.isDue ? ". The draw is due." : "."}</p>
                  {entriesStarted ? (
                    <div><button type="button" className={styles.primaryButton} onClick={() => { setRunError(""); setShowRun(true); }} disabled={busy !== ""}><Trophy size={16} aria-hidden="true" />Run draw</button></div>
                  ) : (
                    <p className={styles.notice}>You can run the draw once entries open on {formatDayTime(campaign.startDate)}.</p>
                  )}
                </>
              )}
              {openDraw && <p className={styles.notice}><strong>What customers are told:</strong> {DATE_CHANGE_NOTICE}</p>}
              {stage.key === "completed" && latestDraw && (
                <p className={styles.muted}>Finished {formatDayTime(latestDraw.executedAt)} · {formatNumber(latestDraw.winnerCount)} winners from {pluralEntries(latestDraw.entryCount)}.</p>
              )}
            </section>
          )}

          {campaign.status !== "draft" && (
            <EntriesPanel campaignId={id} refreshKey={entriesKey} canAdd={canAddEntries} onAdd={() => setShowAddEntry(true)} />
          )}

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.sectionTitle}>Winners</h2>
              <Link href="/lucky-draws/redeem" className={styles.ghostButton}><Ticket size={16} aria-hidden="true" />Redeem a claim code</Link>
            </div>
            {winners.length === 0 ? (
              <p className={styles.muted} style={{ padding: "18px 22px" }}>No winners yet. They appear here after the draw.</p>
            ) : (
              <>
                <div className={styles.tabs} role="tablist" aria-label="Filter winners">
                  {[["all", "All"], ["pending", "Not claimed"], ["claimed", "Claimed"]].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={winnerFilter === key} className={`${styles.tab} ${winnerFilter === key ? styles.tabOn : ""}`} onClick={() => setWinnerFilter(key)}>
                      {label} <span className={styles.tabCount}>{counts[key]}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Winner</th><th>Prize</th><th className={styles.num}>Value</th><th>Claim code</th><th>Status</th><th aria-label="Action" /></tr></thead>
                    <tbody>
                      {shownWinners.map((w) => {
                        const st = winnerStatus(w);
                        return (
                          <tr key={w._id}>
                            <td><strong>{w.customerName}</strong><span className={styles.cellSub}>{maskPhone(w.customerPhone)}</span></td>
                            <td><strong>{PRIZE_LEVEL_LABEL[w.rank]}</strong><span className={styles.cellSub}>{w.prizeDescription}</span></td>
                            <td className={styles.num}>{w.prizeValue ? formatINR(w.prizeValue) : "—"}</td>
                            <td className={styles.mono}>{w.claimCode}</td>
                            <td><span className={`${styles.pill} ${styles[`pill_${st}`]}`}>{WINNER_LABEL[st]}</span></td>
                            <td>{st === "pending" ? <ClaimButton winner={w} onClaimed={load} /> : st === "claimed" ? <span className={styles.cellSub}>{formatDay(w.redeemedAt)}</span> : null}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className={styles.winnerCards} style={{ padding: "12px 16px" }}>
                  {shownWinners.map((w) => {
                    const st = winnerStatus(w);
                    return (
                      <div key={w._id} className={styles.winnerCard}>
                        <div className={styles.cardTop}>
                          <strong>{w.customerName}</strong>
                          <span className={`${styles.pill} ${styles[`pill_${st}`]}`}>{WINNER_LABEL[st]}</span>
                        </div>
                        <div>{PRIZE_LEVEL_LABEL[w.rank]} · {w.prizeDescription}{w.prizeValue ? ` · ${formatINR(w.prizeValue)}` : ""}</div>
                        <div className={styles.muted}>Claim code <span className={styles.mono}>{w.claimCode}</span></div>
                        {st === "pending" && <ClaimButton winner={w} onClaimed={load} />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.stack}>
          <div className={styles.panel}>
            <div className={styles.panelHead}><h2 className={styles.sectionTitle}>Prizes</h2><span className={styles.cellSub}>{formatNumber(totals.totalWinners)} winners</span></div>
            <ul className={styles.sideList}>
              {prizes.map((prize) => (
                <li key={prize.rank}>
                  {prize.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.prizeThumb} src={prize.imageUrl} alt="" />
                  ) : (
                    <span className={styles.prizeThumb}><Gift size={18} aria-hidden="true" /></span>
                  )}
                  <b>{PRIZE_LEVEL_LABEL[prize.rank]} · {prize.prizeDescription}</b>
                  <span className={styles.amount}>{formatNumber(prize.quantity || 1)} × {formatINR(prize.prizeValue || 0)}</span>
                  {drawType === "live_online" && <small>{REVEAL_POSITION[order.indexOf(prize.rank)] || ""}</small>}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}><h2 className={styles.sectionTitle}>History</h2></div>
            <ul className={styles.sideList}>
              {history.map((change, i) => (
                <li key={`${change.changedAt}-${i}`} style={{ gridTemplateColumns: "1fr" }}>
                  <b>{HISTORY_LABEL[change.kind] || HISTORY_LABEL.draw}</b>
                  <small style={{ gridColumn: "1" }}>
                    {formatDayTime(change.previousDate)} → {formatDayTime(change.newDate)} · {formatDay(change.changedAt)}
                    {change.reason ? ` · ${change.reason}` : ""}
                    {change.entrantsNotified ? ` · ${change.entrantsNotifiedCount} told` : ""}
                  </small>
                </li>
              ))}
              {latestDraw && (
                <li style={{ gridTemplateColumns: "1fr" }}><b>{ranLabel}</b><small style={{ gridColumn: "1" }}>{formatDateTime(latestDraw.executedAt)}</small></li>
              )}
              <li style={{ gridTemplateColumns: "1fr" }}><b>Lucky draw created</b><small style={{ gridColumn: "1" }}>{formatDateTime(campaign.createdAt)}</small></li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showRun}
        title="Run the draw now?"
        confirmLabel="Yes, run the draw"
        busyLabel="Drawing…"
        busy={busy === "run"}
        error={runError}
        onConfirm={runNow}
        onClose={() => setShowRun(false)}
      >
        <p className={styles.muted} style={{ margin: 0 }}>
          ScratchX picks {formatNumber(totals.totalWinners)} winner{totals.totalWinners === 1 ? "" : "s"} at random from {pluralEntries(openDraw?.entryCount ?? 0)} and texts each one a claim code. This closes the lucky draw.
          {!entriesClosed ? " Entries close now, so nobody else can enter." : ""}
        </p>
      </ConfirmModal>

      <AddEntryModal
        isOpen={showAddEntry}
        draw={entryDraw}
        onClose={() => {
          setShowAddEntry(false);
          load();
        }}
        onSaved={() => setEntriesKey((k) => k + 1)}
      />
    </div>
  );
}

export default function LuckyDrawDetailPage() {
  return (
    <FlagGate>
      <LuckyDrawDetail />
    </FlagGate>
  );
}
