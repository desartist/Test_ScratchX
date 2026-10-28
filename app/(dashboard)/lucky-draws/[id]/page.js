"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, AlertTriangle, CalendarClock, CalendarPlus, CheckCircle2, Eye, Pause, Play, Plus, QrCode, Radio, Send, Ticket, Trophy } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import ActionRow from "@/components/luckyDraw/ActionRow";
import AddEntryModal from "@/components/luckyDraw/AddEntryModal";
import ConfirmModal from "@/components/luckyDraw/ConfirmModal";
import PageHead from "@/components/luckyDraw/PageHead";
import Sheet from "@/components/luckyDraw/Sheet";
import StepBar from "@/components/luckyDraw/StepBar";
import { drawIcon, levelIcon } from "@/components/luckyDraw/icons";
import { api, formatDateTime, istInputToIso, pluralEntries, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { STAFF_ENTRY_DRAW_TYPES } from "@/lib/luckyDraw/constants";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeTotals } from "@/lib/luckyDraw/prizeCategories";
import { DRAW_TYPE_LABEL, prizeLevelLabel, daysUntil, drawStage, formatDay, formatDayTime, maskEmail, maskPhone, pluralDays } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;
const ENTRIES_PREVIEW = 5;
const HISTORY_LABEL = { entries_close: "Entries close moved", reveal: "Draw date moved", draw: "Draw date changed" };
const winnerStatus = (w) => (w.status === "redeemed" ? "claimed" : w.status === "expired" ? "expired" : "pending");
const WINNER_LABEL = { claimed: "Claimed", pending: "Not claimed", expired: "Expired" };
const WINNER_FILTERS = [["all", "All"], ["pending", "Not claimed"], ["claimed", "Claimed"], ["expired", "Expired"]];

function ExtendSheet({ isOpen, campaign, openDraw, onClose, onSaved }) {
  const closeDate = new Date(campaign.endDate);
  const revealDate = new Date(openDraw?.drawDate || campaign.revealDate || campaign.endDate);
  const entriesClosed = closeDate <= new Date();
  const [target, setTarget] = useState(entriesClosed ? "reveal" : "entries_close");
  const [days, setDays] = useState(entriesClosed ? 3 : 7);
  const [custom, setCustom] = useState("");
  const [notify, setNotify] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const current = target === "entries_close" ? closeDate : revealDate;
  // A date that has already passed is moved from now, so "+1 day" never lands in the past.
  const base = new Date(Math.max(current.getTime(), Date.now()));
  const newDate = days ? new Date(base.getTime() + days * DAY_MS) : custom ? new Date(istInputToIso(custom) || NaN) : null;
  const validNew = newDate && !Number.isNaN(newDate.getTime()) && newDate > current && newDate > new Date();
  const gap = Math.max(0, revealDate - closeDate);
  const revealMoves = target === "entries_close" && validNew && newDate > revealDate;
  const movedReveal = revealMoves ? new Date(newDate.getTime() + gap) : null;
  const customers = openDraw?.customerCount ?? 0;

  const pick = (nextTarget, nextDays) => {
    setTarget(nextTarget);
    setDays(nextDays);
    setCustom("");
    setError("");
  };

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
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      title="Extend dates"
      onClose={onClose}
      focusField={false}
      footer={
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={saving || !validNew} onClick={save}>{saving ? "Saving…" : "Save new dates"}</button>
        </div>
      }
    >
      <div className={styles.form}>
        {error && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
        <div className={styles.field}>
          <span className={styles.label} id="extend-target">What to extend</span>
          <div className={`${styles.seg} ${styles.segFull}`} role="radiogroup" aria-labelledby="extend-target">
            <button type="button" role="radio" aria-checked={target === "entries_close"} disabled={entriesClosed} className={`${styles.segButton} ${target === "entries_close" ? styles.segOn : ""}`} onClick={() => pick("entries_close", 7)}>Entries close</button>
            <button type="button" role="radio" aria-checked={target === "reveal"} className={`${styles.segButton} ${target === "reveal" ? styles.segOn : ""}`} onClick={() => pick("reveal", 3)}>Draw date</button>
          </div>
          {entriesClosed && <p className={styles.hint}>Entries have closed; only the draw date can move.</p>}
        </div>

        <dl className={styles.factGrid}>
          <div><dt>Now</dt><dd>{formatDayTime(current)}</dd></div>
          <div><dt>New</dt><dd>{validNew ? formatDayTime(newDate) : "—"}</dd></div>
        </dl>

        <div className={styles.field}>
          <span className={styles.label} id="extend-by">Extend by</span>
          <div className={styles.chips} role="group" aria-labelledby="extend-by">
            {[1, 3, 7].map((n) => (
              <button key={n} type="button" aria-pressed={days === n} className={`${styles.chipButton} ${days === n ? styles.chipOn : ""}`} onClick={() => { setDays(n); setCustom(""); }}>{pluralDays(n)}</button>
            ))}
            <button type="button" aria-pressed={!days} className={`${styles.chipButton} ${!days ? styles.chipOn : ""}`} onClick={() => { setDays(0); setCustom(toISTInputValue(new Date(base.getTime() + DAY_MS))); }}>Pick a date</button>
          </div>
          {!days && (
            <input type="datetime-local" aria-label="New date and time (IST)" className={styles.input} value={custom} onChange={(e) => setCustom(e.target.value)} />
          )}
        </div>

        {revealMoves && (
          <div className={styles.warn}><AlertTriangle size={18} aria-hidden="true" /><span>The draw date moves too, to <strong>{formatDayTime(movedReveal)}</strong>.</span></div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="extend-reason">Reason <span className={styles.labelHint}>(optional)</span></label>
          <input id="extend-reason" className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Festival week sales are strong" />
        </div>
        <label className={styles.plainCheck}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <span>Tell the {formatNumber(customers)} customer{customers === 1 ? "" : "s"} who entered</span>
        </label>
      </div>
    </Sheet>
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
      {error && <p className={styles.fieldError} role="alert"><AlertCircle size={13} aria-hidden="true" />{error}</p>}
    </>
  );
}

function EntriesSection({ campaignId, refreshKey, canAdd, onAdd }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

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

  const entries = data?.entries || [];
  const shown = showAll ? entries : entries.slice(0, ENTRIES_PREVIEW);

  return (
    <section aria-labelledby="ld-entries-title">
      <div className={styles.listHead}>
        <h2 className={styles.listTitle} id="ld-entries-title">Entries{data ? <span className={styles.listCount}> · {formatNumber(data.total)}</span> : null}</h2>
        {canAdd && <button type="button" className={styles.textLink} onClick={onAdd}>Add entry</button>}
      </div>
      {error && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
      {!data && !error && <p className={styles.muted}>Loading…</p>}
      {data && entries.length === 0 && <p className={styles.muted}>No entries yet.</p>}
      {shown.length > 0 && (
        <ul className={styles.rowList}>
          {shown.map((e) => (
            <li key={e._id} className={styles.row}>
              <span className={`${styles.rowIcon} ${styles.rowNumber}`}>#{e.entryNumber}</span>
              <span className={styles.rowMain}>
                <strong>{e.customerName}</strong>
                <span>{[maskPhone(e.customerPhone), maskEmail(e.customerEmail)].filter(Boolean).join(" · ")}</span>
                <span>{e.source === "staff" ? "Staff" : "QR scan"}{e.storeName ? ` · ${e.storeName}` : ""} · {formatDayTime(e.createdAt)}</span>
              </span>
              <span className={styles.rowSide}>
                <strong>{e.billAmount != null ? formatINR(e.billAmount) : "—"}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
      {entries.length > ENTRIES_PREVIEW && (
        <button type="button" className={`${styles.secondaryButton} ${styles.listMore}`} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
          {showAll ? "Show fewer" : `Show all ${formatNumber(entries.length)}`}
        </button>
      )}
      {showAll && data && data.total > entries.length && <p className={styles.hint} style={{ marginTop: 8 }}>Showing the latest {entries.length} entries.</p>}
    </section>
  );
}

/** The stage's main action: a link or a button, in the head on wider screens and the pinned bar on phones. */
function primaryButton({ href, icon: Icon, label, onClick, disabled }) {
  if (href) return <Link href={href} className={styles.primaryButton}><Icon size={16} aria-hidden="true" />{label}</Link>;
  return <button type="button" className={styles.primaryButton} onClick={onClick} disabled={disabled}><Icon size={16} aria-hidden="true" />{label}</button>;
}

/** The draw's progress on the wizard's step bar: Entries, Draw (or Reveal), Prizes. */
function progressOf({ campaign, stage, reveal, winners, totals, drawn }) {
  const claimed = winners.filter((w) => w.status === "redeemed").length;
  const steps = [
    { name: "Entries", sub: `${formatDay(campaign.startDate)} – ${formatDay(campaign.endDate)}` },
    { name: campaign.drawType === "live_online" ? "Reveal" : "Draw", sub: formatDay(reveal) },
    { name: "Prizes", sub: drawn ? `${formatNumber(claimed)} of ${formatNumber(winners.length)} claimed` : `${formatNumber(totals.totalWinners)} to win` },
  ];
  if (stage.key === "draft" || stage.key === "scheduled") return { steps, done: 0, current: -1 };
  if (stage.key === "completed") {
    const open = winners.some((w) => winnerStatus(w) === "pending");
    return open ? { steps, done: 2, current: 2 } : { steps, done: 3, current: -1 };
  }
  if (stage.key === "open" || (stage.key === "paused" && new Date(campaign.endDate) > new Date())) return { steps, done: 0, current: 0 };
  return { steps, done: 1, current: 1 };
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
  const [allWinners, setAllWinners] = useState(false);
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

  const showError = (message) => {
    setError(message);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  async function perform(label, action, done = "") {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      if (done) setNotice(done);
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy("");
    }
  }

  const winners = useMemo(() => detail?.winners || [], [detail]);

  if (!detail) {
    return (
      <div className={`${styles.container} ${styles.containerCentered}`}>
        <div className={styles.column}>
          <PageHead title="Lucky draw" back={{ href: "/lucky-draws", label: "All lucky draws" }} />
          {error ? <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p> : <p className={styles.loading}>Loading…</p>}
        </div>
      </div>
    );
  }

  const { campaign, openDraw, pastDraws } = detail;
  const drawType = campaign.drawType;
  const DrawIcon = drawIcon(drawType);
  const latestDraw = pastDraws[0];
  const latestReveal = latestDraw?.reveal;
  const revealInProgress = !!latestReveal?.startedAt && !latestReveal?.completedAt;
  const today = now || new Date();
  const stage = drawStage({ ...campaign, revealInProgress }, { now: today, openDraw });
  const reveal = new Date(openDraw?.drawDate || campaign.revealDate || latestDraw?.executedAt || campaign.endDate);
  const totals = prizeTotals(campaign.prizeTiers);
  const prizes = [...campaign.prizeTiers].sort((a, b) => a.rank - b.rank);
  const isDraft = campaign.status === "draft";
  const ended = campaign.status === "ended";
  const canExtend = !ended && !openDraw?.reveal?.startedAt && (openDraw || isDraft);
  const entriesClosed = new Date(campaign.endDate) <= today;
  const entriesStarted = new Date(campaign.startDate) <= today;
  const entriesOpen = campaign.status === "active" && entriesStarted && !entriesClosed;
  const canAddEntries = STAFF_ENTRY_DRAW_TYPES.includes(drawType) && entriesOpen;
  const takesQr = drawType !== "physical";
  const history = [...(openDraw?.dateHistory || [])].reverse();
  const daysLeft = daysUntil(entriesClosed ? reveal : campaign.endDate, today);
  const countdown = stage.key === "live" ? "Live now" : stage.key === "due" ? "Now" : reveal <= today && entriesClosed ? "Due" : daysLeft === 0 ? "Today" : pluralDays(daysLeft);
  const counts = WINNER_FILTERS.reduce((acc, [key]) => ({ ...acc, [key]: key === "all" ? winners.length : winners.filter((w) => winnerStatus(w) === key).length }), {});
  const filters = WINNER_FILTERS.filter(([key]) => key !== "expired" || counts.expired > 0);
  const filteredWinners = winnerFilter === "all" ? winners : winners.filter((w) => winnerStatus(w) === winnerFilter);
  const shownWinners = allWinners ? filteredWinners : filteredWinners.slice(0, ENTRIES_PREVIEW);
  const unclaimed = counts.pending;
  const entryDraw = {
    _id: campaign._id,
    name: campaign.name,
    minBillAmount: campaign.minBillAmount,
    stores: campaign.assignedStores.filter((s) => s.status === "active").map((s) => ({ storeId: s.storeId, storeName: s.storeName })),
  };
  const ranLabel = latestDraw?.triggeredBy?.source === "picked" ? "Winners picked in the shop" : drawType === "live_online" ? "Winners picked for the live reveal" : "Draw ran";
  const progress = progressOf({ campaign, stage, reveal, winners, totals, drawn: !!latestDraw });
  const livePath = `/lucky-draws/${id}/live`;

  const setStatus = (status) =>
    perform("status", () => api(`/api/lucky-draws/campaigns/${id}/status`, { method: "PATCH", body: { status } }), status === "paused" ? "Entries paused." : status === "active" && !isDraft ? "Entries open again." : "");
  async function openQr() {
    setBusy("qr");
    setError("");
    try {
      setQr(await api(`/api/lucky-draws/campaigns/${id}/qr`));
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy("");
    }
  }
  const openRun = () => {
    setRunError("");
    setShowRun(true);
  };

  async function runNow() {
    setBusy("run");
    setRunError("");
    try {
      const result = await api(`/api/lucky-draws/draws/${openDraw._id}/run`, { method: "POST" });
      setShowRun(false);
      const unawarded = totals.totalWinners - result.winners.length;
      setNotice(
        `Done: ${result.winners.length} winner${result.winners.length === 1 ? "" : "s"} picked, ${result.notified.sent} texted.` +
          (unawarded > 0 ? ` ${unawarded} prize${unawarded === 1 ? "" : "s"} not given out (too few entries).` : ""),
      );
      await load();
    } catch (err) {
      setRunError(err.message);
    } finally {
      setBusy("");
    }
  }

  // The one thing to do now, pinned at the bottom like the wizard's Continue.
  let primary = null;
  if (isDraft) primary = { label: busy === "status" ? "Publishing…" : "Publish", icon: Send, onClick: () => setStatus("active"), disabled: busy === "status" };
  else if (revealInProgress) primary = { label: "Continue live reveal", icon: Radio, href: livePath };
  else if (ended) {
    if (unclaimed > 0) primary = { label: "Redeem a claim code", icon: Ticket, href: "/lucky-draws/redeem" };
    else if (drawType === "live_online" && latestDraw) primary = { label: "See the reveal", icon: Radio, href: livePath };
  } else if (entriesClosed && openDraw) {
    if (drawType === "physical") primary = { label: "Pick winners", icon: Trophy, href: `/lucky-draws/${id}/pick` };
    else if (drawType === "live_online") primary = { label: "Go to live reveal", icon: Radio, href: livePath };
    else primary = { label: "Run draw", icon: Trophy, onClick: openRun, disabled: busy !== "" };
  } else if (campaign.status === "paused") primary = { label: busy === "status" ? "Opening…" : "Resume entries", icon: Play, onClick: () => setStatus("active"), disabled: busy === "status" };
  else if (canAddEntries) primary = { label: "Add entry", icon: Plus, onClick: () => setShowAddEntry(true) };
  else if (takesQr) primary = { label: busy === "qr" ? "Loading…" : "QR code", icon: QrCode, onClick: openQr, disabled: busy === "qr" };

  // Everything else the owner can do here, as rows (the review step's list style).
  const actions = [];
  if (takesQr && !isDraft && !ended && primary?.icon !== QrCode) actions.push({ key: "qr", icon: QrCode, label: "QR code", onClick: openQr, disabled: busy === "qr" });
  if (canAddEntries && primary?.icon !== Plus) actions.push({ key: "add", icon: Plus, label: "Add entry", onClick: () => setShowAddEntry(true) });
  if (drawType === "live_online" && !isDraft && primary?.href !== livePath) actions.push({ key: "live", icon: Radio, label: "Live reveal", sub: `Reveal ${formatDayTime(reveal)}`, href: livePath });
  if (drawType === "digital" && openDraw && campaign.status === "active" && entriesStarted && !entriesClosed) {
    actions.push({ key: "run", icon: Trophy, label: "Run draw now", onClick: openRun, disabled: busy !== "" });
  }
  if (canExtend) actions.push({ key: "extend", icon: CalendarPlus, label: "Extend dates", sub: entriesClosed ? `Draw ${formatDayTime(reveal)}` : `Entries close ${formatDayTime(campaign.endDate)}`, onClick: () => setShowExtend(true) });
  if (campaign.status === "active" && !entriesClosed) actions.push({ key: "pause", icon: Pause, label: "Pause entries", onClick: () => setStatus("paused"), disabled: busy === "status", tone: styles.rowIconMuted });
  if (winners.length > 0 && primary?.icon !== Ticket) actions.push({ key: "redeem", icon: Ticket, label: "Redeem a claim code", href: "/lucky-draws/redeem" });
  if (!isDraft) actions.push({ key: "results", icon: Eye, label: "Results page", href: `/lucky-draw/${id}/reveal`, external: true, tone: styles.rowIconNavy });

  return (
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <div className={styles.column}>
        <PageHead title={campaign.name} back={{ href: "/lucky-draws", label: "All lucky draws" }} aside={primary && primaryButton(primary)}>
          <span className={`${styles.pill} ${styles[`pill_${stage.tone}`]}`}>{stage.label}</span>
          <span className={styles.typeChip}><DrawIcon size={14} aria-hidden="true" />{DRAW_TYPE_LABEL[drawType]}</span>
        </PageHead>
        <StepBar steps={progress.steps} done={progress.done} current={progress.current} label="Draw progress" />

        {arrival?.kind === "published" && (
          <div className={styles.okBox} role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span><strong>Published.</strong> Entries open {formatDayTime(campaign.startDate)}.{takesQr ? " Put the QR code at your counters." : ""}</span>
          </div>
        )}
        {arrival?.kind === "picked" && (
          <div className={styles.okBox} role="status"><CheckCircle2 size={18} aria-hidden="true" /><span><strong>Winners saved.</strong> Each one gets an SMS and email with a claim code.</span></div>
        )}
        {arrival?.kind === "draft" && (
          <p className={styles.notice} role="status"><AlertTriangle size={16} aria-hidden="true" /><span><strong>Saved as a draft.</strong> Not published: {arrival.message}</span></p>
        )}
        {error && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
        {notice && <div className={styles.okBox} role="status"><CheckCircle2 size={18} aria-hidden="true" /><span>{notice}</span></div>}

        <section className={styles.summaryCard} aria-label="Details">
          {campaign.description && <p className={styles.summaryDesc}>{campaign.description}</p>}
          <dl className={styles.factGrid} style={campaign.description ? undefined : { borderTop: 0, paddingTop: 0 }}>
            <div><dt>Entries</dt><dd>{formatNumber(openDraw?.entryCount ?? latestDraw?.entryCount ?? 0)}</dd></div>
            <div><dt>Customers</dt><dd>{formatNumber(openDraw?.customerCount ?? latestDraw?.customerCount ?? 0)}</dd></div>
            {ended && latestDraw ? (
              <div><dt>Winners</dt><dd>{formatNumber(latestDraw.winnerCount)} of {formatNumber(totals.totalWinners)}</dd></div>
            ) : (
              <div><dt>{entriesClosed ? "Draw in" : "Entries close in"}</dt><dd>{isDraft ? "—" : countdown}</dd></div>
            )}
            <div><dt>Prize pool</dt><dd>{formatINR(totals.totalValue)}</dd></div>
            <div><dt>Min. bill</dt><dd>{campaign.minBillAmount > 0 ? formatINR(campaign.minBillAmount) : "Any bill"}</dd></div>
            <div><dt>Stores</dt><dd>{campaign.assignedStores.map((s) => s.storeName).join(", ")}</dd></div>
          </dl>
        </section>

        {actions.length > 0 && (
          <section aria-labelledby="ld-manage-title">
            <div className={styles.listHead}><h2 className={styles.listTitle} id="ld-manage-title">Manage</h2></div>
            <div className={styles.rowList}>
              {actions.map(({ key, ...action }) => <ActionRow key={key} {...action} />)}
            </div>
          </section>
        )}

        <section aria-labelledby="ld-prizes-title">
          <div className={styles.listHead}>
            <h2 className={styles.listTitle} id="ld-prizes-title">Prizes</h2>
            {drawType === "live_online" && <span className={styles.listCount}>Smallest revealed first</span>}
          </div>
          <ul className={styles.rowList}>
            {prizes.map((prize) => {
              const Icon = levelIcon(prize.rank);
              const quantity = prize.quantity || 1;
              return (
                <li key={prize.rank} className={styles.row}>
                  {prize.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.rowIcon} src={prize.imageUrl} alt="" />
                  ) : (
                    <span className={styles.rowIcon}><Icon size={20} aria-hidden="true" /></span>
                  )}
                  <span className={styles.rowMain}>
                    <strong>{prize.prizeDescription}</strong>
                    <span>{prizeLevelLabel(prize.rank)}</span>
                  </span>
                  <span className={styles.rowSide}>
                    <strong>{formatINR((prize.prizeValue || 0) * quantity)}</strong>
                    <span>{formatNumber(quantity)} × {formatINR(prize.prizeValue || 0)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className={`${styles.summaryPool} ${styles.poolAfterList}`}>
            <span>Prize pool</span>
            <strong>{formatINR(totals.totalValue)}</strong>
            <span className={styles.summaryPoolSub}>{formatNumber(totals.totalWinners)} winner{totals.totalWinners === 1 ? "" : "s"}</span>
          </div>
        </section>

        {!isDraft && <EntriesSection campaignId={id} refreshKey={entriesKey} canAdd={canAddEntries} onAdd={() => setShowAddEntry(true)} />}

        {(winners.length > 0 || ended) && (
          <section aria-labelledby="ld-winners-title">
            <div className={styles.listHead}>
              <h2 className={styles.listTitle} id="ld-winners-title">Winners{winners.length ? <span className={styles.listCount}> · {formatNumber(winners.length)}</span> : null}</h2>
            </div>
            {winners.length === 0 ? (
              <p className={styles.muted}>No winners.</p>
            ) : (
              <>
                <div className={`${styles.seg} ${styles.segFull}`} role="tablist" aria-label="Filter winners" style={{ marginBottom: 12 }}>
                  {filters.map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={winnerFilter === key} className={`${styles.segButton} ${winnerFilter === key ? styles.segOn : ""}`} onClick={() => { setWinnerFilter(key); setAllWinners(false); }}>
                      {label} <span className={styles.segCount}>{counts[key]}</span>
                    </button>
                  ))}
                </div>
                {shownWinners.length === 0 ? (
                  <p className={styles.muted}>No winners here.</p>
                ) : (
                  <ul className={styles.rowList}>
                    {shownWinners.map((w) => {
                      const st = winnerStatus(w);
                      const Icon = levelIcon(w.rank);
                      return (
                        <li key={w._id} className={styles.row}>
                          <span className={`${styles.rowIcon} ${st === "claimed" ? styles.rowIconGreen : st === "expired" ? styles.rowIconMuted : ""}`}><Icon size={20} aria-hidden="true" /></span>
                          <span className={styles.rowMain}>
                            <strong>{w.customerName}</strong>
                            <span>{prizeLevelLabel(w.rank)} · {w.prizeDescription}</span>
                            <span>{[maskPhone(w.customerPhone), maskEmail(w.customerEmail)].filter(Boolean).join(" · ")}</span>
                          </span>
                          <span className={styles.rowSide}>
                            <span className={`${styles.pill} ${styles[`pill_${st}`]}`}>{WINNER_LABEL[st]}</span>
                          </span>
                          <span className={styles.rowFoot}>
                            <span className={styles.rowMain}><span>Code <span className={styles.mono}>{w.claimCode}</span>{st === "claimed" && w.redeemedAt ? ` · ${formatDay(w.redeemedAt)}` : ""}</span></span>
                            {st === "pending" && <ClaimButton winner={w} onClaimed={load} />}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {filteredWinners.length > ENTRIES_PREVIEW && (
                  <button type="button" className={`${styles.secondaryButton} ${styles.listMore}`} onClick={() => setAllWinners((v) => !v)} aria-expanded={allWinners}>
                    {allWinners ? "Show fewer" : `Show all ${formatNumber(filteredWinners.length)}`}
                  </button>
                )}
              </>
            )}
          </section>
        )}

        <section aria-labelledby="ld-history-title">
          <div className={styles.listHead}><h2 className={styles.listTitle} id="ld-history-title">History</h2></div>
          <ul className={styles.rowList}>
            {history.map((change, i) => (
              <li key={`${change.changedAt}-${i}`} className={styles.row}>
                <span className={`${styles.rowIcon} ${styles.rowIconMuted}`}><CalendarClock size={20} aria-hidden="true" /></span>
                <span className={styles.rowMain}>
                  <strong>{HISTORY_LABEL[change.kind] || HISTORY_LABEL.draw}</strong>
                  <span>{formatDayTime(change.previousDate)} → {formatDayTime(change.newDate)}</span>
                  {(change.reason || change.entrantsNotified) && (
                    <span>{[change.reason, change.entrantsNotified ? `${formatNumber(change.entrantsNotifiedCount)} told` : ""].filter(Boolean).join(" · ")}</span>
                  )}
                </span>
                <span className={styles.rowSide}><span>{formatDay(change.changedAt)}</span></span>
              </li>
            ))}
            {latestDraw && (
              <li className={styles.row}>
                <span className={`${styles.rowIcon} ${styles.rowIconGreen}`}><Trophy size={20} aria-hidden="true" /></span>
                <span className={styles.rowMain}>
                  <strong>{ranLabel}</strong>
                  <span>{formatNumber(latestDraw.winnerCount)} winners from {pluralEntries(latestDraw.entryCount)}</span>
                </span>
                <span className={styles.rowSide}><span>{formatDateTime(latestDraw.executedAt)}</span></span>
              </li>
            )}
            <li className={styles.row}>
              <span className={`${styles.rowIcon} ${styles.rowIconMuted}`}><Send size={20} aria-hidden="true" /></span>
              <span className={styles.rowMain}><strong>Lucky draw created</strong></span>
              <span className={styles.rowSide}><span>{formatDateTime(campaign.createdAt)}</span></span>
            </li>
          </ul>
        </section>

        {primary && <div className={`${styles.wizardFoot} ${styles.phoneFoot}`}>{primaryButton(primary)}</div>}
      </div>

      {showExtend && (
        <ExtendSheet
          isOpen
          campaign={campaign}
          openDraw={openDraw}
          onClose={() => setShowExtend(false)}
          onSaved={async (result) => {
            setShowExtend(false);
            const moved = result.revealMoved ? ` Draw ${formatDayTime(result.draw?.drawDate || result.campaign.revealDate)}.` : "";
            const told = result.notifiedCount ? ` ${formatNumber(result.notifiedCount)} customer${result.notifiedCount === 1 ? "" : "s"} told.` : "";
            setNotice(`Dates updated. Entries close ${formatDayTime(result.campaign.endDate)}.${moved}${told}`);
            await load();
          }}
        />
      )}

      <Sheet
        isOpen={!!qr}
        title="Customer QR code"
        onClose={() => setQr(null)}
        footer={
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setQr(null)}>Close</button>
            {qr && <a className={styles.primaryButton} href={qr.dataUrl} download={`lucky-draw-${id}.png`}>Download PNG</a>}
          </div>
        }
      >
        {qr && (
          <div className={styles.qrSheet}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.qr} src={qr.dataUrl} alt="QR code for the lucky draw entry page" />
            <p className={styles.mono}>{qr.url}</p>
          </div>
        )}
      </Sheet>

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
          Picks {formatNumber(totals.totalWinners)} winner{totals.totalWinners === 1 ? "" : "s"} at random from {pluralEntries(openDraw?.entryCount ?? 0)} and sends each a claim code. This ends the draw{!entriesClosed ? " and closes entries now" : ""}.
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
