"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api, describePrizeScope, describeTier, formatDateTime } from "@/lib/luckyDraw/clientApi";
import styles from "./page.module.css";

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser cannot share its location, which this draw needs."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("Allow location access so we can confirm you are at the store, then try again.")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

function DrawDate({ drawDate, previousDrawDate }) {
  if (!drawDate) return null;
  return (
    <div>
      <div className={styles.drawDate}>Draw planned for {formatDateTime(drawDate)}</div>
      {previousDrawDate && <div className={styles.wasDate}>Was {formatDateTime(previousDrawDate)}</div>}
    </div>
  );
}

function EntryPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ customerName: "", customerMobile: "", billAmount: "", consent: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [entered, setEntered] = useState(null);
  const [statusMobile, setStatusMobile] = useState("");
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api(`/api/customer/lucky-draw/campaigns/${campaignId}`)
      .then((data) => !cancelled && setCampaign(data))
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const position = campaign.requiresLocation ? await getPosition() : {};
      const result = await api("/api/customer/lucky-draw/participate", {
        method: "POST",
        body: {
          campaignId,
          customerName: form.customerName,
          customerMobile: form.customerMobile,
          billAmount: Number(form.billAmount),
          consent: form.consent,
          ...position,
        },
      });
      setEntered(result);
      setStatusMobile(form.customerMobile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus(event) {
    event.preventDefault();
    setStatusError("");
    setStatus(null);
    try {
      setStatus(await api("/api/customer/lucky-draw/status", { method: "POST", body: { campaignId, customerMobile: statusMobile } }));
    } catch (err) {
      setStatusError(err.message);
    }
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.panel}>
            <h1 className={styles.title}>We couldn&rsquo;t open this Lucky Draw</h1>
            <p className={styles.error} role="alert">{loadError}</p>
            <p className={styles.muted}>Please scan the QR code at the store again, or ask a member of staff for help.</p>
          </div>
        </div>
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className={styles.page}>
        <div className={styles.card}><p className={styles.muted}>Loading…</p></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.panel}>
          <h1 className={styles.title}>{campaign.name}</h1>
          {campaign.description && <p className={styles.muted}>{campaign.description}</p>}
          {!entered && <DrawDate drawDate={campaign.drawDate} previousDrawDate={campaign.previousDrawDate} />}
          {!entered && <p className={styles.notice} role="note">{campaign.notice}</p>}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.heading}>Prizes</h2>
          <ol className={styles.list}>
            {campaign.prizes.map((prize) => {
              const scope = describePrizeScope(prize.tierIndexes, campaign.entryTiers);
              return (
                <li key={prize.rank}>
                  {prize.prizeDescription}
                  {scope && <span className={styles.muted}> ({scope.charAt(0).toLowerCase() + scope.slice(1)})</span>}
                </li>
              );
            })}
          </ol>
          <h2 className={styles.heading}>How to earn entries</h2>
          <ul className={styles.list}>
            {campaign.entryTiers.map((tier, i) => <li key={i}>{describeTier(tier)}</li>)}
          </ul>
          {campaign.maxEntriesPerCustomerPerPeriod && (
            <p className={styles.muted}>You can hold up to {campaign.maxEntriesPerCustomerPerPeriod} entries per draw.</p>
          )}
        </div>

        {entered ? (
          <div className={styles.panel} role="status">
            <p className={styles.success}>
              <span className={styles.big}>You&rsquo;re in!</span><br />
              {entered.entriesGranted} {entered.entriesGranted === 1 ? "entry" : "entries"} added
              {entered.capped ? " (you reached the limit for this draw)" : ""}. You now hold {entered.totalEntries}.
            </p>
            <DrawDate drawDate={entered.drawDate} />
            <p className={styles.notice}>{entered.notice}</p>
            {entered.confirmationSent && <p className={styles.muted}>We sent you an SMS with these details.</p>}
          </div>
        ) : campaign.isOpen ? (
          <form className={`${styles.panel} ${styles.form}`} onSubmit={submit}>
            <h2 className={styles.heading}>Enter the draw</h2>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ld-name">Your name</label>
              <input id="ld-name" className={styles.input} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required minLength={2} maxLength={80} autoComplete="name" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ld-mobile">Mobile number</label>
              <input id="ld-mobile" className={styles.input} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.customerMobile} onChange={(e) => setForm({ ...form, customerMobile: e.target.value.replace(/\D/g, "") })} required autoComplete="tel-national" placeholder="10 digits" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ld-bill">Bill amount (₹)</label>
              <input id="ld-bill" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={form.billAmount} onChange={(e) => setForm({ ...form, billAmount: e.target.value })} required />
            </div>
            <label className={styles.check}>
              <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} required />
              <span>I agree to be contacted by SMS about this draw and to my details being used to run it.</span>
            </label>
            <button type="submit" className={styles.button} disabled={busy}>{busy ? "Entering…" : "Enter the draw"}</button>
            {campaign.requiresLocation && <p className={styles.muted}>We will ask for your location to check you are at a participating store.</p>}
          </form>
        ) : (
          <div className={styles.panel}><p className={styles.muted}>This Lucky Draw is not open for entries right now.</p></div>
        )}

        <div className={styles.panel}>
          <h2 className={styles.heading}>Check my entries</h2>
          <form className={styles.form} onSubmit={checkStatus}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ld-status-mobile">Mobile number</label>
              <input id="ld-status-mobile" className={styles.input} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={statusMobile} onChange={(e) => setStatusMobile(e.target.value.replace(/\D/g, ""))} required />
            </div>
            <button type="submit" className={styles.button}>Show my entries</button>
          </form>
          {statusError && <p className={styles.error} role="alert">{statusError}</p>}
          {status && (
            <div role="status" className={styles.result}>
              <p><strong>{status.totalEntries}</strong> {status.totalEntries === 1 ? "entry" : "entries"} in the next draw.</p>
              <DrawDate drawDate={status.drawDate} previousDrawDate={status.previousDrawDate} />
              {status.wins.map((win, i) => (
                <p key={i} className={styles.win}>
                  You won #{win.rank}: {win.prizeDescription}. {win.status === "redeemed" ? "Already collected." : win.status === "expired" ? "The claim period has ended." : `Show the code we texted you at the store before ${formatDateTime(win.expiresAt)}.`}
                </p>
              ))}
              <p className={styles.notice}>{status.notice}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LuckyDrawEntryPage() {
  return (
    <FlagGate>
      <EntryPage />
    </FlagGate>
  );
}
