"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api, formatDateTime } from "@/lib/luckyDraw/clientApi";
import { prizeLevelLabel } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

function RedeemForm() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      setResult(await api("/api/lucky-draws/redeem", { method: "POST", body: { claimCode: code } }));
      setCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <Link href="/lucky-draws" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />All lucky draws</Link>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Redeem a prize</h1>
        </div>
      </div>

      <form className={styles.section} onSubmit={submit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="claim-code">Claim code</label>
          <input id="claim-code" className={`${styles.input} ${styles.mono}`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="go" maxLength={12} required />
        </div>
        <div><button type="submit" className={`${styles.primaryButton} ${styles.blockOnMobile}`} disabled={busy || code.trim() === ""}>{busy ? "Checking…" : "Redeem prize"}</button></div>
      </form>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {result && (
        <section className={styles.section} role="status">
          <h2 className={styles.sectionTitle}>Prize redeemed</h2>
          <p><strong>{prizeLevelLabel(result.rank)} · {result.prizeDescription}</strong> for {result.customerName}</p>
          <p className={styles.muted}>{formatDateTime(result.redeemedAt)} · hand it over now.</p>
        </section>
      )}
    </div>
  );
}

export default function RedeemPage() {
  return (
    <FlagGate>
      <RedeemForm />
    </FlagGate>
  );
}
