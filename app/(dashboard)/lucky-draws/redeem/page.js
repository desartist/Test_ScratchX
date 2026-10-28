"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Ticket } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import PageHead from "@/components/luckyDraw/PageHead";
import { levelIcon } from "@/components/luckyDraw/icons";
import { api, formatDateTime } from "@/lib/luckyDraw/clientApi";
import { formatINR } from "@/lib/luckyDraw/calculator";
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

  const PrizeIcon = result ? levelIcon(result.rank) : Ticket;

  return (
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <form className={styles.column} onSubmit={submit} noValidate>
        <PageHead title="Redeem a prize" back={{ href: "/lucky-draws", label: "Lucky draws" }} />

        {error && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
        {result && (
          <section className={`${styles.summaryCard} ${styles.resultCard}`} role="status" aria-labelledby="ld-redeemed">
            <span className={styles.resultIcon}><CheckCircle2 size={28} aria-hidden="true" /></span>
            <h2 className={styles.summaryName} id="ld-redeemed">Prize redeemed</h2>
            <ul className={styles.rowList} style={{ width: "100%", textAlign: "left" }}>
              <li className={styles.row}>
                <span className={styles.rowIcon}><PrizeIcon size={20} aria-hidden="true" /></span>
                <span className={styles.rowMain}>
                  <strong>{result.prizeDescription}</strong>
                  <span>{prizeLevelLabel(result.rank)} · {result.customerName}</span>
                </span>
                <span className={styles.rowSide}>
                  {result.prizeValue ? <strong>{formatINR(result.prizeValue)}</strong> : null}
                  <span>{formatDateTime(result.redeemedAt)}</span>
                </span>
              </li>
            </ul>
          </section>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="claim-code">Claim code</label>
          <input
            id="claim-code"
            className={`${styles.input} ${styles.codeInput}`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD2345"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={12}
            aria-invalid={!!error}
          />
        </div>

        <div className={styles.wizardFoot}>
          <button type="submit" className={styles.primaryButton} disabled={busy || code.trim() === ""}><Ticket size={16} aria-hidden="true" />{busy ? "Checking…" : "Redeem prize"}</button>
        </div>
      </form>
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
