"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarPlus, CheckCircle2, ClipboardList, Clock, Eye, Gift, Globe, QrCode, Radio, Send, Ticket, X } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api, describePrizeScope, describeTier, formatDateTime, istInputToIso, pluralEntries, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { DATE_CHANGE_NOTICE } from "@/lib/luckyDraw/constants";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeTotals, revealOrder } from "@/lib/luckyDraw/prizeCategories";
import { MODE_LABEL, daysUntil, drawStage, formatDay, formatDayTime, formatSlipNumber, pluralDays, timelinePosition } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

const MODE_ICON = { online: Globe, manual_online_reveal: Radio, manual_offline_reveal: ClipboardList };
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_LABEL = { entries_close: "Entries close moved", reveal: "Reveal date moved", draw: "Draw date changed" };
const maskPhone = (phone) => (phone ? `XXXXXX${String(phone).slice(-4)}` : "");
const winnerStatus = (w) => (w.status === "redeemed" ? "claimed" : w.status === "expired" ? "expired" : "pending");
const WINNER_LABEL = { claimed: "Claimed", pending: "Not claimed", expired: "Expired" };

function ExtendPanel({ campaign, openDraw, isOnline, onClose, onSaved }) {
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
  const revealMoves = target === "entries_close" && validNew && newDate > revealDate && campaign.drawConfig?.scheduleType !== "recurring";
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
        body: { target, newDate: newDate.toISOString(), reason, notifyEntrants: isOnline && notify },
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
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.extRow}>
          <span className={styles.label}>What to extend</span>
          <div className={styles.seg} role="radiogroup" aria-label="What to extend">
            <button type="button" role="radio" aria-checked={target === "entries_close"} disabled={entriesClosed} className={`${styles.segButton} ${target === "entries_close" ? styles.segOn : ""}`} onClick={() => { setTarget("entries_close"); setDays(7); setCustom(""); }}>Entries close</button>
            <button type="button" role="radio" aria-checked={target === "reveal"} className={`${styles.segButton} ${target === "reveal" ? styles.segOn : ""}`} onClick={() => { setTarget("reveal"); setDays(3); setCustom(""); }}>Reveal date</button>
          </div>
        </div>
        {entriesClosed && <p className={styles.hint}>Entries have already closed, so only the reveal date can move.</p>}
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
          <div className={styles.warn}><AlertTriangle size={18} aria-hidden="true" /><span><strong>The reveal moves too, to {formatDayTime(movedReveal)}.</strong> Winners can only be revealed after entries close, so the same gap is kept.</span></div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="extend-reason">Reason (optional, kept in the history)</label>
          <input id="extend-reason" className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Festival week sales are strong" />
        </div>
        {isOnline && (
          <label className={styles.checkRow}>
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span>Tell the {openDraw?.customerCount ?? 0} customer{openDraw?.customerCount === 1 ? "" : "s"} who already entered by SMS</span>
          </label>
        )}
        <p className={styles.hint}>Dates can only move later. The change is saved in the draw&rsquo;s history.</p>
      </div>
      <div className={styles.panelFoot}>
        <button type="button" className={styles.ghostButton} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.primaryButton} disabled={saving || !validNew} onClick={save}>{saving ? "Saving…" : "Save new dates"}</button>
      </div>
    </section>
  );
}

function ClaimButton({ winner, onClaimed }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isSlip = winner.slipNumber != null;

  async function claim(event) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/lucky-draws/winners/${winner._id}/claim`, { method: "PATCH", body: isSlip ? { customerName: name, customerPhone: phone } : {} });
      onClaimed();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!open) {
    return <button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => (isSlip ? setOpen(true) : claim())} disabled={busy}>{busy ? "Saving…" : "Mark as claimed"}</button>;
  }
  return (
    <form className={styles.claimForm} onSubmit={claim}>
      <input className={styles.input} aria-label="Collected by (optional)" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <input className={styles.input} aria-label="Mobile (optional)" placeholder="Mobile (optional)" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))} />
      <button type="submit" className={`${styles.primaryButton} ${styles.smallButton}`} disabled={busy}>{busy ? "Saving…" : "Claimed"}</button>
      <button type="button" className={styles.ghostButton} onClick={() => setOpen(false)}>Cancel</button>
      {error && <p className={styles.fieldError} role="alert" style={{ width: "100%" }}>{error}</p>}
    </form>
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
  const [confirmRun, setConfirmRun] = useState(false);
  const [slipInput, setSlipInput] = useState("");
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [arrival, setArrival] = useState(null);
  const [now, setNow] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/lucky-draws/campaigns/${id}`);
      setDetail(data);
      setSlipInput(String(data.campaign.slipCount || 0));
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
        {error ? <p className={styles.error} role="alert">{error}</p> : <p className={styles.muted}>Loading…</p>}
        <Link href="/lucky-draws" className={styles.secondaryButton}>Back to lucky draws</Link>
      </div>
    );
  }

  const { campaign, openDraw, pastDraws } = detail;
  const mode = campaign.distributionMode || "online";
  const isOnline = mode === "online";
  const ModeIcon = MODE_ICON[mode];
  const stage = drawStage(campaign, { now: now || new Date(), openDraw });
  const isManualTrigger = campaign.drawConfig.triggerMode === "manual";
  const reveal = new Date(openDraw?.drawDate || campaign.revealDate || pastDraws[0]?.executedAt || campaign.endDate);
  const pos = timelinePosition({ start: campaign.startDate, close: campaign.endDate, reveal, now: now || new Date() });
  const totals = prizeTotals(campaign.prizeTiers);
  const order = revealOrder(campaign.prizeTiers);
  const canExtend = campaign.status !== "ended" && !openDraw?.reveal?.startedAt && (openDraw || campaign.status === "draft");
  const entriesClosed = new Date(campaign.endDate) <= (now || new Date());
  const latestDraw = pastDraws[0];
  const history = [...(openDraw?.dateHistory || [])].reverse();
  const counts = { all: winners.length, pending: winners.filter((w) => winnerStatus(w) === "pending").length, claimed: winners.filter((w) => winnerStatus(w) === "claimed").length };

  const setStatus = (status) => perform("status", () => api(`/api/lucky-draws/campaigns/${id}/status`, { method: "PATCH", body: { status } }));
  const showQr = () => perform("qr", async () => setQr(await api(`/api/lucky-draws/campaigns/${id}/qr`)));
  const saveSlips = (event) => {
    event.preventDefault();
    perform("slips", async () => {
      await api(`/api/lucky-draws/campaigns/${id}/slips`, { method: "PATCH", body: { slipCount: Number(slipInput) } });
      setNotice(`Slips 0001 to ${formatSlipNumber(Number(slipInput))} recorded.`);
    });
  };
  const runNow = () =>
    perform("run", async () => {
      const result = await api(`/api/lucky-draws/draws/${openDraw._id}/run`, { method: "POST" });
      setConfirmRun(false);
      const unawarded = totals.totalWinners - result.winners.length;
      setNotice(
        `Draw complete: ${result.winners.length} winner${result.winners.length === 1 ? "" : "s"} picked, ${result.notified.sent} told by SMS.` +
          (unawarded > 0 ? ` ${unawarded} prize${unawarded === 1 ? "" : "s"} could not be awarded because not enough eligible customers entered.` : ""),
      );
    });

  return (
    <div className={styles.container}>
      <Link href="/lucky-draws" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />All lucky draws</Link>
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.title} ${styles.titleRow}`}>{campaign.name}<span className={`${styles.pill} ${styles[`pill_${stage.tone}`]}`}>{stage.label}</span></h1>
          <p className={styles.subtitle}>
            <span className={styles.modeTag}><ModeIcon size={15} aria-hidden="true" />{MODE_LABEL[mode]}</span> · {campaign.assignedStores.map((s) => s.storeName).join(", ")}
          </p>
        </div>
        <div className={styles.actions}>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <button className={styles.primaryButton} disabled={busy === "status"} onClick={() => setStatus("active")}><Send size={16} aria-hidden="true" />{campaign.status === "draft" ? "Publish" : "Resume entries"}</button>
          )}
          {campaign.status === "active" && isOnline && !entriesClosed && (
            <button className={styles.secondaryButton} disabled={busy === "status"} onClick={() => setStatus("paused")}>Pause entries</button>
          )}
          {isOnline && <button className={styles.secondaryButton} disabled={busy === "qr"} onClick={showQr}><QrCode size={16} aria-hidden="true" />QR code</button>}
          <a className={styles.secondaryButton} href={`/lucky-draw/${id}/reveal`} target="_blank" rel="noreferrer"><Eye size={16} aria-hidden="true" />Reveal page</a>
          {canExtend && <button className={styles.navyButton} onClick={() => setShowExtend(true)}><CalendarPlus size={16} aria-hidden="true" />Extend dates</button>}
        </div>
      </div>

      {arrival?.kind === "published" && (
        <div className={styles.okBox} role="status"><CheckCircle2 size={18} aria-hidden="true" /><span><strong>Your lucky draw is published.</strong> {isOnline ? "Put the QR code at your counters so customers can enter" : "Start handing out numbered slips at your counters"} from {formatDayTime(campaign.startDate)}. Winners are revealed on {formatDayTime(reveal)}.</span></div>
      )}
      {arrival?.kind === "draft" && (
        <p className={styles.notice} role="status"><strong>Saved as a draft.</strong> It could not be published yet: {arrival.message}</p>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}

      {showExtend && (
        <ExtendPanel
          campaign={campaign}
          openDraw={openDraw}
          isOnline={isOnline}
          onClose={() => setShowExtend(false)}
          onSaved={async (result) => {
            setShowExtend(false);
            const moved = result.revealMoved ? ` Winners are now revealed on ${formatDayTime(result.draw?.drawDate || result.campaign.revealDate)}.` : "";
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
                  <div><small>Winners revealed</small><b>{formatDayTime(reveal)}</b></div>
                </div>
              </div>
            </div>
            <dl className={styles.statStrip}>
              {isOnline ? (
                <>
                  <div><dt>Entries</dt><dd>{formatNumber(openDraw?.entryCount ?? latestDraw?.entryCount ?? 0)}</dd></div>
                  <div><dt>Customers</dt><dd>{formatNumber(openDraw?.customerCount ?? 0)}</dd></div>
                </>
              ) : (
                <>
                  <div><dt>Slips handed out</dt><dd>{formatNumber(campaign.slipCount || 0)}</dd></div>
                  <div><dt>Winners</dt><dd>{formatNumber(totals.totalWinners)}</dd></div>
                </>
              )}
              <div><dt>{entriesClosed ? "Reveal in" : "Entries close in"}</dt><dd>{stage.key === "completed" ? "Done" : pluralDays(daysUntil(entriesClosed ? reveal : campaign.endDate, now || new Date()))}</dd></div>
              <div><dt>Prize pool</dt><dd>{formatINR(totals.totalValue)}</dd></div>
            </dl>
          </div>

          {!isOnline && campaign.status !== "ended" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Entry slips</h2>
              <form className={styles.row} onSubmit={saveSlips} style={{ alignItems: "end" }}>
                <div className={styles.field} style={{ maxWidth: 240 }}>
                  <label className={styles.label} htmlFor="slip-count">Slips handed out so far</label>
                  <input id="slip-count" className={styles.input} inputMode="numeric" value={slipInput} onChange={(e) => setSlipInput(e.target.value.replace(/[^\d]/g, ""))} />
                </div>
                <button type="submit" className={styles.secondaryButton} disabled={busy === "slips" || Number(slipInput) === campaign.slipCount}>{busy === "slips" ? "Saving…" : "Update"}</button>
              </form>
              <p className={styles.hint}>Slips are numbered 0001 to {formatSlipNumber(Math.max(1, campaign.slipCount || 1))}. The count can only go up, so slips already printed stay valid.</p>
            </section>
          )}

          {campaign.status !== "draft" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{stage.key === "completed" ? "Draw" : "Draw day"}</h2>
              {mode === "manual_offline_reveal" && stage.key !== "completed" && (
                <>
                  <p className={styles.muted}>On the reveal date, draw slips in front of your customers, smallest prize first, and type in the winning numbers.</p>
                  <div>
                    {entriesClosed ? (
                      <Link href={`/lucky-draws/${id}/record`} className={styles.primaryButton}><ClipboardList size={16} aria-hidden="true" />Record winners</Link>
                    ) : (
                      <span className={styles.hint}>You can record winners once entries close on {formatDayTime(campaign.endDate)}.</span>
                    )}
                  </div>
                </>
              )}
              {mode === "manual_online_reveal" && (
                <>
                  <p className={styles.muted}>ScratchX picks the winning slips at random. You reveal them live, one prize at a time, while customers watch the reveal page.</p>
                  <div className={styles.actions}>
                    <Link href={`/lucky-draws/${id}/live`} className={styles.primaryButton}><Radio size={16} aria-hidden="true" />{latestDraw?.reveal?.completedAt ? "See the reveal" : "Go to live reveal"}</Link>
                  </div>
                </>
              )}
              {isOnline && openDraw && (
                <>
                  <p className={styles.muted}>
                    {isManualTrigger ? "Nothing happens on the date. Press Run draw when you are ready." : `The draw runs by itself on ${formatDayTime(openDraw.drawDate)}. You can also run it now.`}
                    {openDraw.isDue && isManualTrigger && " The draw is due."}
                  </p>
                  <div className={styles.row}>
                    {!confirmRun ? (
                      <button className={styles.primaryButton} onClick={() => setConfirmRun(true)} disabled={busy !== ""}>{isManualTrigger ? "Run draw" : "Run draw now"}</button>
                    ) : (
                      <>
                        <span>Draw winners now from {pluralEntries(openDraw.entryCount)}?{campaign.drawConfig.scheduleType === "end_of_campaign" && " This closes the lucky draw."}</span>
                        <button className={styles.primaryButton} onClick={runNow} disabled={busy === "run"}>{busy === "run" ? "Drawing…" : "Yes, run the draw"}</button>
                        <button className={styles.secondaryButton} onClick={() => setConfirmRun(false)}>Cancel</button>
                      </>
                    )}
                  </div>
                  <p className={styles.notice}><strong>What customers are told:</strong> {DATE_CHANGE_NOTICE}</p>
                </>
              )}
              {stage.key === "completed" && latestDraw && (
                <p className={styles.muted}>Finished {formatDayTime(latestDraw.executedAt)} · {formatNumber(latestDraw.winnerCount)} winners from {formatNumber(latestDraw.entryCount)} {isOnline ? "entries" : "slips"}.</p>
              )}
            </section>
          )}

          {isOnline && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Entries per bill</h2>
              <ul className={styles.list}>{campaign.entryTiers.map((tier, i) => <li key={i}>{describeTier(tier)}</li>)}</ul>
              {campaign.maxEntriesPerCustomerPerPeriod && <p className={styles.muted}>Limit: {pluralEntries(campaign.maxEntriesPerCustomerPerPeriod)} per customer per draw.</p>}
            </section>
          )}

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.sectionTitle}>Winners</h2>
              <Link href="/lucky-draws/redeem" className={`${styles.ghostButton}`}><Ticket size={16} aria-hidden="true" />Redeem a claim code</Link>
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
                            <td>
                              {w.slipNumber != null ? <span className={styles.mono}>Slip {formatSlipNumber(w.slipNumber)}</span> : <strong>{w.customerName}</strong>}
                              <span className={styles.cellSub}>{w.slipNumber != null ? [w.customerName, maskPhone(w.customerPhone)].filter(Boolean).join(" · ") : maskPhone(w.customerPhone)}</span>
                            </td>
                            <td>{w.prizeDescription}</td>
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
                          <strong>{w.slipNumber != null ? `Slip ${formatSlipNumber(w.slipNumber)}` : w.customerName}</strong>
                          <span className={`${styles.pill} ${styles[`pill_${st}`]}`}>{WINNER_LABEL[st]}</span>
                        </div>
                        <div>{w.prizeDescription}{w.prizeValue ? ` · ${formatINR(w.prizeValue)}` : ""}</div>
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
              {campaign.prizeTiers.map((prize) => {
                const scope = describePrizeScope(prize.tierIndexes, campaign.entryTiers);
                const position = order.indexOf(prize.rank);
                const revealLabel = position === order.length - 1 ? "Revealed last" : position === 0 ? "Revealed first" : `Revealed ${["first", "second", "third", "fourth", "fifth"][position] || `#${position + 1}`}`;
                return (
                  <li key={prize.rank}>
                    {prize.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.prizeThumb} src={prize.imageUrl} alt="" />
                    ) : (
                      <span className={styles.prizeThumb}><Gift size={18} aria-hidden="true" /></span>
                    )}
                    <b>{prize.prizeDescription}</b>
                    <span className={styles.amount}>{formatNumber(prize.quantity || 1)} × {formatINR(prize.prizeValue || 0)}</span>
                    <small>{revealLabel}{scope ? ` · ${scope}` : ""}</small>
                  </li>
                );
              })}
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
                <li style={{ gridTemplateColumns: "1fr" }}><b>{isOnline ? "Draw ran" : "Winners picked"}</b><small style={{ gridColumn: "1" }}>{formatDateTime(latestDraw.executedAt)}</small></li>
              )}
              <li style={{ gridTemplateColumns: "1fr" }}><b>Lucky draw created</b><small style={{ gridColumn: "1" }}>{formatDateTime(campaign.createdAt)}</small></li>
            </ul>
          </div>
        </div>
      </div>
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
