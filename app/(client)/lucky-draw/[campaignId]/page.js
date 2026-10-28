"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CalendarClock, CheckCircle2, Radio, Trophy } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import FieldError from "@/components/luckyDraw/FieldError";
import { focusFirstError } from "@/components/luckyDraw/focusFirstError";
import { drawIcon, levelIcon } from "@/components/luckyDraw/icons";
import { api, formatDateTime } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { DRAW_TYPE_LABEL, prizeLevelLabel, describeMinBill, formatDayTime } from "@/lib/luckyDraw/display";
import { blankQrEntryForm, qrEntryFormErrors, qrFieldId } from "@/lib/luckyDraw/entryForm";
import ui from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";
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
    <p className={styles.drawDate}>
      <CalendarClock size={18} aria-hidden="true" />
      <span>
        {live ? "Winners revealed live on" : "Draw planned for"} <strong>{formatDateTime(drawDate)}</strong>
        {previousDrawDate && <span className={styles.wasDate}>Was {formatDateTime(previousDrawDate)}</span>}
      </span>
    </p>
  );
}

const Req = () => <span className={ui.required} aria-hidden="true">*</span>;

/** "SMS and email" / "SMS" / "email", for the confirmation line. */
function sentBy({ confirmationSent, emailSent }) {
  if (confirmationSent && emailSent) return "an SMS and an email";
  if (confirmationSent) return "an SMS";
  return emailSent ? "an email" : "";
}

function EntryPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(blankQrEntryForm);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [entered, setEntered] = useState(null);
  const [statusMobile, setStatusMobile] = useState("");
  const [statusMobileError, setStatusMobileError] = useState("");
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api(`/api/customer/lucky-draw/campaigns/${campaignId}`)
      .then((data) => !cancelled && setCampaign(data))
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };
  const fieldClass = (key) => `${ui.input} ${errors[key] ? ui.inputError : ""}`;

  async function submit(event) {
    event.preventDefault();
    setError("");
    const found = qrEntryFormErrors(form);
    setErrors(found);
    if (Object.keys(found).length) {
      window.requestAnimationFrame(() => focusFirstError(found, qrFieldId));
      return;
    }
    setBusy(true);
    try {
      const position = campaign.requiresLocation ? await getPosition() : {};
      const result = await api("/api/customer/lucky-draw/participate", {
        method: "POST",
        body: {
          campaignId,
          customerName: form.customerName.trim(),
          customerMobile: form.customerMobile,
          customerEmail: form.customerEmail.trim(),
          consent: form.consent,
          ...position,
        },
      });
      setEntered(result);
      setStatusMobile(form.customerMobile);
      window.scrollTo?.({ top: 0, behavior: "smooth" });
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
    if (!/^[0-9]{10}$/.test(statusMobile)) {
      setStatusMobileError(statusMobile ? "Enter a 10-digit number." : "Enter your WhatsApp number.");
      document.getElementById("ld-status-mobile")?.focus();
      return;
    }
    setStatusMobileError("");
    setChecking(true);
    try {
      setStatus(await api("/api/customer/lucky-draw/status", { method: "POST", body: { campaignId, customerMobile: statusMobile } }));
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setChecking(false);
    }
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <section className={ui.summaryCard}>
            <h1 className={styles.title}>We couldn&rsquo;t open this Lucky Draw</h1>
            <p className={ui.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{loadError}</p>
            <p className={ui.muted}>Scan the store&rsquo;s QR code again, or ask the staff.</p>
          </section>
        </div>
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className={styles.page}>
        <div className={styles.card}><p className={ui.loading}>Loading…</p></div>
      </div>
    );
  }

  const live = campaign.drawType === "live_online";
  const takesQr = campaign.takesQrEntries;
  const TypeIcon = drawIcon(campaign.drawType);
  const sent = entered ? sentBy(entered) : "";
  const winners = campaign.prizes.reduce((sum, p) => sum + (p.quantity || 1), 0);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <section className={ui.summaryCard} aria-labelledby="ld-draw-name">
          <div className={ui.summaryTitle}>
            <h1 className={styles.title} id="ld-draw-name">{campaign.name}</h1>
            <span className={ui.typeChip}><TypeIcon size={14} aria-hidden="true" />{DRAW_TYPE_LABEL[campaign.drawType]}</span>
          </div>
          {campaign.description && <p className={styles.description}>{campaign.description}</p>}
          <DrawDate drawDate={campaign.drawDate} previousDrawDate={campaign.previousDrawDate} live={live} />
          {!entered && campaign.drawDate && <p className={styles.dateNote}>{campaign.notice}</p>}
        </section>

        {entered ? (
          <section className={`${ui.summaryCard} ${ui.resultCard}`} role="status" aria-labelledby="ld-entered">
            <span className={ui.resultIcon}><CheckCircle2 size={28} aria-hidden="true" /></span>
            <h2 className={ui.summaryName} id="ld-entered">You&rsquo;re in!</h2>
            <p className={ui.resultBig}>#{entered.entryNumber}</p>
            <p className={ui.muted}>{entered.totalEntries} {entered.totalEntries === 1 ? "entry" : "entries"} in total</p>
            <DrawDate drawDate={entered.drawDate} live={live} />
            {sent && <p className={ui.muted}>We sent you {sent}.</p>}
          </section>
        ) : !takesQr ? (
          <p className={ui.notice}><AlertTriangle size={16} aria-hidden="true" /><span>Entries are added at the counter when you pay.</span></p>
        ) : campaign.isOpen ? (
          <form id="enter" className={`${ui.summaryCard} ${styles.anchor}`} onSubmit={submit} noValidate aria-labelledby="ld-enter-title">
            <h2 className={ui.listTitle} id="ld-enter-title">Enter the draw</h2>
            {error && <p className={ui.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
            <div className={ui.field}>
              <label className={ui.label} htmlFor={qrFieldId("customerName")}>Full name<Req /></label>
              <input id={qrFieldId("customerName")} className={fieldClass("customerName")} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} maxLength={80} autoComplete="name" aria-invalid={!!errors.customerName} />
              <FieldError message={errors.customerName} />
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor={qrFieldId("customerMobile")}>WhatsApp number<Req /></label>
              <input id={qrFieldId("customerMobile")} className={fieldClass("customerMobile")} type="tel" inputMode="numeric" maxLength={10} placeholder="10 digits" value={form.customerMobile} onChange={(e) => set("customerMobile", e.target.value.replace(/\D/g, ""))} autoComplete="tel-national" aria-invalid={!!errors.customerMobile} />
              <FieldError message={errors.customerMobile} />
            </div>
            <div className={ui.field}>
              <label className={ui.label} htmlFor={qrFieldId("customerEmail")}>Email<Req /></label>
              <input id={qrFieldId("customerEmail")} className={fieldClass("customerEmail")} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} placeholder="name@example.com" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} aria-invalid={!!errors.customerEmail} />
              <FieldError message={errors.customerEmail} />
            </div>
            <div className={ui.publishCheck}>
              <label id={qrFieldId("consent")} tabIndex={-1} className={`${ui.plainCheck} ${errors.consent ? ui.plainCheckError : ""}`}>
                <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={!!errors.consent} />
                <span>I agree to get SMS and email about this draw and to my details being used to run it.</span>
              </label>
              <FieldError message={errors.consent} />
            </div>
            <button type="submit" className={`${ui.primaryButton} ${styles.block}`} disabled={busy}>{busy ? "Entering…" : "Enter the draw"}</button>
            {campaign.requiresLocation && <p className={ui.hint} style={{ textAlign: "center" }}>We&rsquo;ll check your location to confirm you&rsquo;re at the store.</p>}
          </form>
        ) : (
          <p className={ui.notice}><AlertTriangle size={16} aria-hidden="true" /><span>Entries aren&rsquo;t open right now.</span></p>
        )}

        <section aria-labelledby="ld-prizes-title">
          <div className={ui.listHead}>
            <h2 className={ui.listTitle} id="ld-prizes-title">Prizes</h2>
            <span className={ui.listCount}>{formatNumber(winners)} winner{winners === 1 ? "" : "s"}</span>
          </div>
          <ul className={ui.rowList}>
            {campaign.prizes.map((prize) => {
              const Icon = levelIcon(prize.rank);
              return (
                <li key={prize.rank} className={ui.row}>
                  {prize.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={ui.rowIcon} src={prize.imageUrl} alt={prize.prizeDescription} />
                  ) : (
                    <span className={ui.rowIcon}><Icon size={20} aria-hidden="true" /></span>
                  )}
                  <span className={ui.rowMain}>
                    <strong>{prize.prizeDescription}</strong>
                    <span>{prize.level}</span>
                  </span>
                  <span className={ui.rowSide}>
                    <strong>{prize.prizeValue ? formatINR(prize.prizeValue) : "—"}</strong>
                    <span>{prize.quantity > 1 ? `${formatNumber(prize.quantity)} winners` : "1 winner"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={ui.summaryCard} aria-label="Dates and how to enter">
          <dl className={ui.factGrid} style={{ borderTop: 0, paddingTop: 0 }}>
            <div><dt>Entries open</dt><dd>{formatDayTime(campaign.startDate)}</dd></div>
            <div><dt>Entries close</dt><dd>{formatDayTime(campaign.endDate)}</dd></div>
            <div><dt>{live ? "Winners revealed live" : "Draw date"}</dt><dd>{formatDayTime(campaign.revealDate || campaign.drawDate)}</dd></div>
            <div><dt>Stores</dt><dd>{campaign.stores.map((s) => s.storeName).join(", ") || "—"}</dd></div>
          </dl>
          <p className={styles.howTo}>
            {describeMinBill(campaign.minBillAmount)}.{" "}
            {!takesQr ? "Ask the staff to add it when you pay." : live ? "Scan the store’s QR code, or ask the staff." : "Scan the store’s QR code."}
          </p>
          <Link className={`${ui.secondaryButton} ${styles.block}`} href={`/lucky-draw/${campaignId}/reveal`}>
            {live ? <Radio size={16} aria-hidden="true" /> : <Trophy size={16} aria-hidden="true" />}
            {live ? "Watch the live reveal" : "See the winners"}
          </Link>
        </section>

        <form className={ui.summaryCard} onSubmit={checkStatus} noValidate aria-labelledby="ld-check-title">
          <h2 className={ui.listTitle} id="ld-check-title">Check my entries</h2>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="ld-status-mobile">WhatsApp number</label>
            <input id="ld-status-mobile" className={`${ui.input} ${statusMobileError ? ui.inputError : ""}`} type="tel" inputMode="numeric" maxLength={10} placeholder="10 digits" value={statusMobile} onChange={(e) => { setStatusMobile(e.target.value.replace(/\D/g, "")); setStatusMobileError(""); }} aria-invalid={!!statusMobileError} />
            <FieldError message={statusMobileError} />
          </div>
          <button type="submit" className={`${ui.secondaryButton} ${styles.block}`} disabled={checking}>{checking ? "Checking…" : "Show my entries"}</button>
          {statusError && <p className={ui.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{statusError}</p>}
          {status && (
            <div role="status" className={styles.result}>
              <p className={styles.resultLine}><strong>{status.totalEntries}</strong> {status.totalEntries === 1 ? "entry" : "entries"} in this draw.</p>
              <DrawDate drawDate={status.drawDate} previousDrawDate={status.previousDrawDate} live={live} />
              {status.wins.map((win, i) => (
                <p key={i} className={styles.win}>
                  <Trophy size={16} aria-hidden="true" />
                  <span>You won the {prizeLevelLabel(win.rank).toLowerCase()}: {win.prizeDescription}. {win.status === "redeemed" ? "Collected." : win.status === "expired" ? "Claim period ended." : `Show your code at the store by ${formatDateTime(win.expiresAt)}.`}</span>
                </p>
              ))}
              {status.revealInProgress && <p className={styles.resultLine}>Winners are being revealed live.</p>}
              {status.campaignStatus === "ended" && !status.revealInProgress && status.totalEntries > 0 && status.wins.length === 0 && (
                <p className={styles.resultLine}>No prize this time.</p>
              )}
            </div>
          )}
        </form>
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
