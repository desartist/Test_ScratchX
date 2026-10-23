"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FlagGate from "@/components/luckyDraw/FlagGate";
import Link from "next/link";
import { Gift } from "lucide-react";
import { api, formatDateTime } from "@/lib/luckyDraw/clientApi";
import { formatINR } from "@/lib/luckyDraw/calculator";
import { prizeLevelLabel, describeMinBill, formatDayTime } from "@/lib/luckyDraw/display";
import styles from "./page.module.css";

// Demo only: NEXT_PUBLIC_LUCKY_DRAW_DEMO_LOCATION="lat,lng" is used when the browser can't give a location
// (e.g. a desktop with no location fix). Leave it unset everywhere else.
const DEMO_LOCATION = (() => {
  const [latitude, longitude] = String(process.env.NEXT_PUBLIC_LUCKY_DRAW_DEMO_LOCATION || "").split(",").map(Number);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && process.env.NEXT_PUBLIC_LUCKY_DRAW_DEMO_LOCATION ? { latitude, longitude } : null;
})();

function getPosition() {
  return new Promise((resolve, reject) => {
    const fail = (message) => (DEMO_LOCATION ? resolve(DEMO_LOCATION) : reject(new Error(message)));
    if (!navigator.geolocation) {
      fail("Your browser cannot share its location, which this draw needs.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => fail("Allow location access so we can confirm you are at the store, then try again."),
      { enableHighAccuracy: true, timeout: DEMO_LOCATION ? 5000 : 15000 },
    );
  });
}

function DrawDate({ drawDate, previousDrawDate, live = false }) {
  if (!drawDate) return null;
  return (
    <div>
      <div className={styles.drawDate}>{live ? "Winners revealed live on" : "Draw planned for"} {formatDateTime(drawDate)}</div>
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
            <p className={styles.muted}>Scan the store&rsquo;s QR code again, or ask the staff.</p>
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

  const live = campaign.drawType === "live_online";
  const takesQr = campaign.takesQrEntries;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.panel}>
          <h1 className={styles.title}>{campaign.name}</h1>
          {campaign.description && <p className={styles.muted}>{campaign.description}</p>}
          {!entered && <DrawDate drawDate={campaign.drawDate} previousDrawDate={campaign.previousDrawDate} live={live} />}
          {!entered && <p className={styles.notice} role="note">{campaign.notice}</p>}
          {!entered && campaign.isOpen && takesQr && <a className={styles.button} href="#enter">Enter the draw</a>}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.heading}>Prizes</h2>
          <div className={styles.prizeGrid}>
            {campaign.prizes.map((prize) => (
              <div key={prize.rank} className={styles.prizeCard}>
                {prize.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.prizeImg} src={prize.imageUrl} alt={prize.prizeDescription} />
                ) : (
                  <span className={styles.prizeImg} aria-hidden="true"><Gift size={26} color="#8a5300" /></span>
                )}
                <div>
                  <div className={styles.muted}>{prize.level}</div>
                  <strong>{prize.prizeDescription}</strong>
                  <div className={styles.muted}>
                    {prize.quantity > 1 ? `${prize.quantity} winners · ` : ""}
                    {prize.prizeValue ? `worth ${formatINR(prize.prizeValue)}${prize.quantity > 1 ? " each" : ""}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ul className={styles.dates}>
            <li><span>Entries open</span><b>{formatDayTime(campaign.startDate)}</b></li>
            <li><span>Entries close</span><b>{formatDayTime(campaign.endDate)}</b></li>
            <li><span>{live ? "Winners revealed live" : "Draw date"}</span><b>{formatDayTime(campaign.revealDate || campaign.drawDate)}</b></li>
          </ul>
          <h2 className={styles.heading}>How to enter</h2>
          <p className={styles.muted}>
            {describeMinBill(campaign.minBillAmount)}.{" "}
            {!takesQr ? "Ask the staff to add it when you pay." : live ? "Scan the store’s QR code, or ask the staff." : "Scan the store’s QR code."}
          </p>
          <Link className={styles.linkButton} href={`/lucky-draw/${campaignId}/reveal`}>
            {live ? "Watch the live reveal" : "See the winners"}
          </Link>
        </div>

        {entered ? (
          <div className={styles.panel} role="status">
            <p className={styles.success}>
              <span className={styles.big}>You&rsquo;re in!</span><br />
              Entry <strong>#{entered.entryNumber}</strong> · {entered.totalEntries} {entered.totalEntries === 1 ? "entry" : "entries"} in total
            </p>
            <DrawDate drawDate={entered.drawDate} live={live} />
            {entered.confirmationSent && <p className={styles.muted}>We sent you an SMS.</p>}
          </div>
        ) : !takesQr ? (
          <div className={styles.panel}><p className={styles.notice}>Entries are added at the counter when you pay.</p></div>
        ) : campaign.isOpen ? (
          <form id="enter" className={`${styles.panel} ${styles.form} ${styles.anchor}`} onSubmit={submit}>
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
              <input id="ld-bill" className={styles.input} type="number" inputMode="decimal" min={campaign.minBillAmount || 0} step="any" value={form.billAmount} onChange={(e) => setForm({ ...form, billAmount: e.target.value })} required />
            </div>
            <label className={styles.check}>
              <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} required />
              <span>I agree to SMS about this draw and to my details being used to run it.</span>
            </label>
            <button type="submit" className={styles.button} disabled={busy}>{busy ? "Entering…" : "Enter the draw"}</button>
            {campaign.requiresLocation && <p className={styles.muted}>We&rsquo;ll check your location to confirm you&rsquo;re at the store.</p>}
          </form>
        ) : (
          <div className={styles.panel}><p className={styles.muted}>Entries aren&rsquo;t open right now.</p></div>
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
              {status.drawStatus && <p><strong>{status.totalEntries}</strong> {status.totalEntries === 1 ? "entry" : "entries"} in this draw.</p>}
              <DrawDate drawDate={status.drawDate} previousDrawDate={status.previousDrawDate} live={live} />
              {status.wins.map((win, i) => (
                <p key={i} className={styles.win}>
                  You won the {prizeLevelLabel(win.rank).toLowerCase()}: {win.prizeDescription}. {win.status === "redeemed" ? "Collected." : win.status === "expired" ? "Claim period ended." : `Show your SMS code at the store by ${formatDateTime(win.expiresAt)}.`}
                </p>
              ))}
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
