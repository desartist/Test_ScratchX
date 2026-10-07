"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Info, IndianRupee, Plus, Trophy, X } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { formatINR, formatNumber, parseAmount, suggestSplit, summarize } from "@/lib/luckyDraw/calculator";
import { CALCULATOR_STORAGE_KEY } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

const blankRow = () => ({ prizeDescription: "", prizeValue: "", quantity: "1" });
const toRows = (prizes) =>
  prizes.map((p) => ({ prizeDescription: p.prizeDescription, prizeValue: formatNumber(p.prizeValue), quantity: String(p.quantity) }));

/** Keeps what the owner typed but shows digits grouped the Indian way once they leave the field. */
const tidy = (value) => (parseAmount(value) ? formatNumber(parseAmount(value)) : "");

function Calculator() {
  const router = useRouter();
  const [mode, setMode] = useState("budget");
  const [pool, setPool] = useState("75,000");
  const [rows, setRows] = useState(() => toRows(suggestSplit(75000)));
  const [entries, setEntries] = useState("1,000");
  const [limit, setLimit] = useState("");

  const budgetRows = useMemo(() => toRows(suggestSplit(parseAmount(pool))), [pool]);
  const activeRows = mode === "budget" ? budgetRows : rows;
  const result = summarize({
    categories: activeRows,
    expectedEntries: entries,
    budgetLimit: mode === "prizes" ? limit : 0,
  });

  const setRow = (index, patch) => setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const adjust = () => {
    setRows(budgetRows.length ? budgetRows : [blankRow()]);
    setMode("prizes");
  };

  const useInDraw = () => {
    const prizes = result.shares.map((s) => ({ prizeDescription: s.prizeDescription || "Prize", prizeValue: s.prizeValue, quantity: s.quantity }));
    try {
      window.sessionStorage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(prizes));
    } catch {
      // Private browsing can block storage; the form then simply starts empty.
    }
    router.push("/lucky-draws/new?from=calculator");
  };

  const poolMissing = mode === "budget" && parseAmount(pool) === 0;

  return (
    <div className={styles.container}>
      <Link href="/lucky-draws" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />All lucky draws</Link>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Prize calculator</h1>
          <p className={styles.subtitle}>See what a lucky draw will cost before you start one. Nothing here is saved or published.</p>
        </div>
      </div>

      <div className={styles.calcGrid}>
        <div className={`${styles.panel} ${styles.panelBody}`}>
          <div className={styles.field}>
            <span className={styles.label} id="calc-start">Start from</span>
            <div className={styles.seg} role="radiogroup" aria-labelledby="calc-start">
              <button type="button" role="radio" aria-checked={mode === "budget"} className={`${styles.segButton} ${mode === "budget" ? styles.segOn : ""}`} onClick={() => setMode("budget")}>
                <IndianRupee size={16} aria-hidden="true" />A budget
              </button>
              <button type="button" role="radio" aria-checked={mode === "prizes"} className={`${styles.segButton} ${mode === "prizes" ? styles.segOn : ""}`} onClick={() => setMode("prizes")}>
                <Trophy size={16} aria-hidden="true" />A list of prizes
              </button>
            </div>
          </div>

          {mode === "budget" ? (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="calc-pool">Prize pool</label>
                <div className={styles.moneyInput} style={{ maxWidth: 260 }}>
                  <span>₹</span>
                  <input id="calc-pool" className={`${styles.input} ${poolMissing ? styles.inputError : ""}`} inputMode="numeric" value={pool} onChange={(e) => setPool(e.target.value)} onBlur={() => setPool(tidy(pool))} placeholder="75,000" />
                </div>
                {poolMissing ? (
                  <p className={styles.fieldError} role="alert">Enter how much you want to spend, like 75,000.</p>
                ) : (
                  <p className={styles.hint}>We suggest 1 grand prize, 5 second prizes and 10 third prizes. You can change any of them.</p>
                )}
              </div>
              <div><button type="button" className={styles.secondaryButton} onClick={adjust} disabled={poolMissing}>Adjust these prizes</button></div>
            </>
          ) : (
            <div className={styles.field}>
              <span className={styles.label}>Prizes</span>
              <p className={styles.hint}>List the biggest prize first. Each row is a prize and how many winners get it.</p>
              {rows.map((row, index) => {
                const lineTotal = parseAmount(row.prizeValue) * parseAmount(row.quantity);
                return (
                  <div key={index} className={styles.prizeLine} style={{ gridTemplateColumns: "minmax(0, 2fr) 90px minmax(0, 1.2fr) 110px auto" }}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={`calc-name-${index}`}>Prize</label>
                      <input id={`calc-name-${index}`} className={styles.input} value={row.prizeDescription} onChange={(e) => setRow(index, { prizeDescription: e.target.value })} placeholder="e.g. Grand prize" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={`calc-qty-${index}`}>Winners</label>
                      <input id={`calc-qty-${index}`} className={styles.input} inputMode="numeric" value={row.quantity} onChange={(e) => setRow(index, { quantity: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={`calc-val-${index}`}>Value each</label>
                      <div className={styles.moneyInput}>
                        <span>₹</span>
                        <input id={`calc-val-${index}`} className={styles.input} inputMode="numeric" value={row.prizeValue} onChange={(e) => setRow(index, { prizeValue: e.target.value })} onBlur={() => setRow(index, { prizeValue: tidy(row.prizeValue) })} />
                      </div>
                    </div>
                    <div className={styles.lineTotal}>{lineTotal ? formatINR(lineTotal) : "—"}</div>
                    <button type="button" className={styles.ghostButton} aria-label={`Remove ${row.prizeDescription || "this prize"}`} onClick={() => setRows((list) => (list.length > 1 ? list.filter((_, i) => i !== index) : [blankRow()]))}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
              <div><button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => setRows((list) => [...list, blankRow()])}><Plus size={15} aria-hidden="true" />Add prize</button></div>
              {result.incompleteRows > 0 && <p className={styles.hint}>Rows without winners or a value are left out of the total.</p>}
              <div className={styles.field} style={{ maxWidth: 260 }}>
                <label className={styles.label} htmlFor="calc-limit">Your budget (optional)</label>
                <div className={styles.moneyInput}>
                  <span>₹</span>
                  <input id="calc-limit" className={styles.input} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} onBlur={() => setLimit(tidy(limit))} placeholder="No limit" />
                </div>
              </div>
            </div>
          )}

          <div className={styles.field} style={{ maxWidth: 260 }}>
            <label className={styles.label} htmlFor="calc-entries">Expected entries</label>
            <input id="calc-entries" className={styles.input} inputMode="numeric" value={entries} onChange={(e) => setEntries(e.target.value)} onBlur={() => setEntries(tidy(entries))} placeholder="1,000" />
            <p className={styles.hint}>Roughly how many customers you think will enter.</p>
          </div>

          <p className={styles.info}><Info size={16} aria-hidden="true" />Prizes are revealed smallest first on draw day, so the grand prize is always the last one.</p>
        </div>

        <aside className={`${styles.panel} ${styles.resultCard}`} aria-live="polite">
          <div className={styles.resultTop}>
            <small>Total prize cost</small>
            <strong>{formatINR(result.totalCost)}</strong>
            <span>{result.totalWinners ? `For ${formatNumber(result.totalWinners)} winner${result.totalWinners === 1 ? "" : "s"}` : "Add a prize to see the cost"}</span>
          </div>
          {result.budget && (
            <p className={result.budget.over ? styles.error : styles.success} style={{ borderRadius: 0 }}>
              {result.budget.over
                ? `${formatINR(result.budget.difference)} over your budget`
                : `${formatINR(result.budget.difference)} under your budget`}
            </p>
          )}
          <dl className={styles.facts}>
            <div><dt>Cost per entry</dt><dd>{result.costPerEntry != null ? formatINR(result.costPerEntry) : "—"}</dd></div>
            <div><dt>Chance to win</dt><dd>{result.chanceOneIn != null ? `1 in ${formatNumber(result.chanceOneIn)}` : "—"}</dd></div>
          </dl>
          <div className={styles.tierBars}>
            {result.shares.map((s, i) => (
              <div key={i} className={styles.tierBar}>
                <b>{s.prizeDescription || `Prize ${i + 1}`}</b>
                <span className={styles.amount}>{formatINR(s.total)}</span>
                <small>{formatNumber(s.quantity)} × {formatINR(s.prizeValue)} · {s.percent}% of pool</small>
                <span className={styles.bar}><i style={{ width: `${s.percent}%` }} /></span>
              </div>
            ))}
          </div>
          <div className={styles.panelFoot} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <button type="button" className={styles.primaryButton} onClick={useInDraw} disabled={result.totalWinners === 0}>
              Create a draw with these prizes<ArrowRight size={16} aria-hidden="true" />
            </button>
            <Link href="/lucky-draws" className={styles.ghostButton} style={{ justifyContent: "center" }}>Close calculator</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <FlagGate>
      <Calculator />
    </FlagGate>
  );
}
