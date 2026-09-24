"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api, describeTier, formatDateTime, istInputToIso, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { DATE_CHANGE_NOTICE } from "@/lib/luckyDraw/constants";
import styles from "../luckyDraws.module.css";

const STATUS_LABEL = { draft: "Draft", active: "Active", paused: "Paused", ended: "Ended" };
const maskPhone = (phone) => `XXXXXX${String(phone).slice(-4)}`;

function LuckyDrawDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [dateForm, setDateForm] = useState({ value: "", reason: "", notify: true });
  const [confirmRun, setConfirmRun] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await api(`/api/lucky-draws/campaigns/${id}`));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
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

  if (!detail) {
    return (
      <div className={styles.container}>
        {error ? <p className={styles.error} role="alert">{error}</p> : <p className={styles.muted}>Loading…</p>}
        <Link href="/lucky-draws" className={styles.secondaryButton}>Back to Lucky Draws</Link>
      </div>
    );
  }

  const { campaign, openDraw, pastDraws, winners } = detail;
  const isManual = campaign.drawConfig.triggerMode === "manual";

  const setStatus = (status) =>
    perform("status", () => api(`/api/lucky-draws/campaigns/${id}/status`, { method: "PATCH", body: { status } }));

  const showQr = () =>
    perform("qr", async () => {
      setQr(await api(`/api/lucky-draws/campaigns/${id}/qr`));
    });

  const runNow = () =>
    perform("run", async () => {
      const result = await api(`/api/lucky-draws/draws/${openDraw._id}/run`, { method: "POST" });
      setConfirmRun(false);
      setNotice(`Draw complete: ${result.winners.length} winner${result.winners.length === 1 ? "" : "s"} picked, ${result.notified.sent} told by SMS.`);
    });

  const changeDate = (event) => {
    event.preventDefault();
    const drawDate = istInputToIso(dateForm.value);
    if (!drawDate) {
      setError("Enter a valid draw date and time");
      return;
    }
    perform("date", async () => {
      const result = await api(`/api/lucky-draws/draws/${openDraw._id}/date`, {
        method: "PATCH",
        body: { drawDate, reason: dateForm.reason, notifyEntrants: dateForm.notify },
      });
      setShowDate(false);
      setNotice(
        dateForm.notify
          ? `Draw date updated. ${result.notifiedCount} of ${result.entrantCount} entrants were told.`
          : "Draw date updated. Entrants were not messaged; they can still see the new date on their entry page.",
      );
    });
  };

  const openDateForm = () => {
    setDateForm({ value: toISTInputValue(openDraw.drawDate), reason: "", notify: true });
    setShowDate(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{campaign.name}</h1>
          <p className={styles.subtitle}>
            <span className={`${styles.chip} ${styles[`chip_${campaign.status}`]}`}>{STATUS_LABEL[campaign.status]}</span>{" "}
            {isManual ? "You run the draw" : "Draws automatically"} · Entries {formatDateTime(campaign.startDate)} to {formatDateTime(campaign.endDate)}
          </p>
        </div>
        <div className={styles.actions}>
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <button className={styles.primaryButton} disabled={busy === "status"} onClick={() => setStatus("active")}>Activate</button>
          )}
          {campaign.status === "active" && (
            <button className={styles.secondaryButton} disabled={busy === "status"} onClick={() => setStatus("paused")}>Pause entries</button>
          )}
          <button className={styles.secondaryButton} disabled={busy === "qr"} onClick={showQr}>Show QR code</button>
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}

      {qr && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Customer QR code</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.qr} src={qr.dataUrl} alt="QR code for the Lucky Draw entry page" />
          <p className={styles.muted}>Customers scan this in the store. Link: <span className={styles.mono}>{qr.url}</span></p>
          <div><a className={styles.secondaryButton} href={qr.dataUrl} download={`lucky-draw-${id}.png`}>Download PNG</a></div>
        </section>
      )}

      {openDraw ? (
        <section className={styles.section}>
          <div className={styles.row}>
            <h2 className={styles.sectionTitle}>Next draw</h2>
            {openDraw.isDue && <span className={`${styles.chip} ${styles.chip_due}`}>Due{isManual ? " — waiting for you" : ""}</span>}
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}><span className={styles.statValue}>{formatDateTime(openDraw.drawDate)}</span><span className={styles.statLabel}>Draw date (IST)</span></div>
            <div className={styles.stat}><span className={styles.statValue}>{openDraw.entryCount}</span><span className={styles.statLabel}>Entries</span></div>
            <div className={styles.stat}><span className={styles.statValue}>{openDraw.customerCount}</span><span className={styles.statLabel}>Customers</span></div>
          </div>

          <div className={styles.row}>
            <button className={styles.secondaryButton} onClick={openDateForm} disabled={busy !== ""}>Change draw date</button>
            {!confirmRun ? (
              <button className={styles.primaryButton} onClick={() => setConfirmRun(true)} disabled={busy !== "" || campaign.status === "draft"}>
                {isManual ? "Run Draw" : "Run Draw Now"}
              </button>
            ) : (
              <>
                <span>Draw winners now from {openDraw.entryCount} entr{openDraw.entryCount === 1 ? "y" : "ies"}?
                  {campaign.drawConfig.scheduleType === "end_of_campaign" && " This closes the campaign."}</span>
                <button className={styles.primaryButton} onClick={runNow} disabled={busy === "run"}>{busy === "run" ? "Drawing…" : "Yes, run the draw"}</button>
                <button className={styles.secondaryButton} onClick={() => setConfirmRun(false)}>Cancel</button>
              </>
            )}
          </div>

          {showDate && (
            <form className={styles.form} onSubmit={changeDate}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ld-newdate">New draw date and time (IST)</label>
                <input id="ld-newdate" type="datetime-local" className={styles.input} value={dateForm.value} onChange={(e) => setDateForm({ ...dateForm, value: e.target.value })} required />
                <p className={styles.hint}>You can move it earlier or later, any number of times, until the draw runs.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ld-reason">Reason (optional, kept in the history)</label>
                <input id="ld-reason" className={styles.input} value={dateForm.reason} onChange={(e) => setDateForm({ ...dateForm, reason: e.target.value })} maxLength={300} placeholder="e.g. Sales are lower than planned" />
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={dateForm.notify} onChange={(e) => setDateForm({ ...dateForm, notify: e.target.checked })} />
                <span>Tell everyone who has entered by SMS ({openDraw.customerCount} customer{openDraw.customerCount === 1 ? "" : "s"})</span>
              </label>
              <div className={styles.actions}>
                <button type="submit" className={styles.primaryButton} disabled={busy === "date"}>{busy === "date" ? "Saving…" : "Save new date"}</button>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowDate(false)}>Cancel</button>
              </div>
            </form>
          )}

          <p className={styles.notice}><strong>What customers are told:</strong> {DATE_CHANGE_NOTICE}</p>

          {openDraw.dateHistory?.length > 0 && (
            <div>
              <h3 className={styles.sectionTitle}>Date changes</h3>
              {[...openDraw.dateHistory].reverse().map((change) => (
                <div key={change.changedAt} className={styles.historyItem}>
                  <div>{formatDateTime(change.previousDate)} → <strong>{formatDateTime(change.newDate)}</strong></div>
                  <div className={styles.muted}>
                    Changed {formatDateTime(change.changedAt)}
                    {change.reason ? ` · ${change.reason}` : ""}
                    {change.entrantsNotified ? ` · ${change.entrantsNotifiedCount} entrants told` : " · entrants not messaged"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Next draw</h2>
          <p className={styles.muted}>
            {campaign.status === "ended" ? "This campaign has finished." : "The first draw is created when you activate the campaign."}
          </p>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Entries and prizes</h2>
        <ul>
          {campaign.entryTiers.map((tier, i) => <li key={i}>{describeTier(tier)}</li>)}
        </ul>
        <ol>
          {campaign.prizeTiers.map((prize) => <li key={prize.rank}>{prize.prizeDescription}</li>)}
        </ol>
        {campaign.maxEntriesPerCustomerPerPeriod && <p className={styles.muted}>Limit: {campaign.maxEntriesPerCustomerPerPeriod} entries per customer per draw.</p>}
      </section>

      <section className={styles.section}>
        <div className={styles.row}>
          <h2 className={styles.sectionTitle}>Winners</h2>
          <Link href="/lucky-draws/redeem" className={styles.secondaryButton}>Redeem a prize</Link>
        </div>
        {winners.length === 0 ? (
          <p className={styles.muted}>No winners yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Prize</th><th>Winner</th><th>Claim code</th><th>Status</th><th>Claim by</th></tr></thead>
              <tbody>
                {winners.map((winner) => (
                  <tr key={winner._id}>
                    <td>#{winner.rank} {winner.prizeDescription}</td>
                    <td>{winner.customerName}<br /><span className={styles.muted}>{maskPhone(winner.customerPhone)}</span></td>
                    <td className={styles.mono}>{winner.claimCode}</td>
                    <td><span className={`${styles.chip} ${styles[`chip_${winner.status}`]}`}>{winner.status}</span></td>
                    <td>{formatDateTime(winner.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pastDraws.length > 0 && (
          <p className={styles.muted}>
            Past draws: {pastDraws.map((d) => `${formatDateTime(d.executedAt)} (${d.entryCount} entries, ${d.winnerCount} winners)`).join(" · ")}
          </p>
        )}
      </section>
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
