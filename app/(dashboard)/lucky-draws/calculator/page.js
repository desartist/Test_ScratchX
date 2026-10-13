"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { CALCULATOR_DEFAULTS, billIncrease, formatINR, formatNumber, parseAmount, planBudget, planEntries, prizePoolSummary } from "@/lib/luckyDraw/calculator";
import { PRIZE_LEVEL_LABEL } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

/** Keeps what the owner typed but shows digits grouped the Indian way once they leave the field. */
const tidy = (value) => (parseAmount(value) ? formatNumber(parseAmount(value)) : "");

function NumberField({ id, label, value, onChange, prefix, suffix, hint }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={prefix ? styles.moneyInput : undefined} style={{ maxWidth: 220 }}>
        {prefix && <span>{prefix}</span>}
        <input id={id} className={styles.input} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onChange(tidy(value))} />
      </div>
      {suffix && <p className={styles.hint}>{suffix}</p>}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

function Working({ children }) {
  return <p className={styles.info} style={{ fontVariantNumeric: "tabular-nums" }}><Info size={16} aria-hidden="true" /><span>{children}</span></p>;
}

function Calculator() {
  const [plan, setPlan] = useState(CALCULATOR_DEFAULTS);
  const set = (key, value) => setPlan((p) => ({ ...p, [key]: value }));
  const setLevel = (level, key, value) => setPlan((p) => ({ ...p, [level]: { ...p[level], [key]: value } }));

  const entries = planEntries(plan);
  const bills = billIncrease({ ...plan, entries: entries.entries });
  const budget = planBudget({ entries: entries.entries, spendPerEntry: plan.spendPerEntry });
  const pool = prizePoolSummary({ ...plan, entries: entries.entries, budget: budget.budget, extraSales: bills.extraSales });
  const campaignBillLow = bills.campaign > 0 && bills.perBill <= 0;

  return (
    <div className={styles.container}>
      <Link href="/lucky-draws" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />All lucky draws</Link>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Prize calculator</h1>
          <p className={styles.subtitle}>Plan a lucky draw before you create one: expected entries, extra sales, budget and prizes. Nothing here is saved.</p>
        </div>
      </div>

      <div className={styles.calcGrid}>
        <div className={styles.stack}>
          <section className={styles.section} aria-labelledby="calc-entries-title">
            <h2 className={styles.sectionTitle} id="calc-entries-title">1. Expected entries</h2>
            <div className={styles.row}>
              <NumberField id="calc-walkins" label="Daily walk-ins" value={plan.dailyWalkIns} onChange={(v) => set("dailyWalkIns", v)} suffix="People per day" />
              <NumberField id="calc-extra" label="Extra footfall (%)" value={plan.extraPercent} onChange={(v) => set("extraPercent", v)} suffix="From the draw" />
              <NumberField id="calc-days" label="Duration (days)" value={plan.days} onChange={(v) => set("days", v)} />
            </div>
            <Working>
              {formatNumber(entries.walkIns)} people/day + {entries.extra}% = {formatNumber(entries.perDay)} people × {formatNumber(entries.days)} days = <strong>{formatNumber(entries.entries)} entries</strong>
            </Working>
          </section>

          <section className={styles.section} aria-labelledby="calc-bill-title">
            <h2 className={styles.sectionTitle} id="calc-bill-title">2. Bill size</h2>
            <div className={styles.row}>
              <NumberField id="calc-normal" label="Normal average bill" prefix="₹" value={plan.normalBill} onChange={(v) => set("normalBill", v)} />
              <div className={styles.field}>
                <label className={styles.label} htmlFor="calc-campaign">Campaign average bill</label>
                <div className={styles.moneyInput} style={{ maxWidth: 220 }}>
                  <span>₹</span>
                  <input id="calc-campaign" className={`${styles.input} ${campaignBillLow ? styles.inputError : ""}`} inputMode="numeric" value={plan.campaignBill} onChange={(e) => set("campaignBill", e.target.value)} onBlur={() => set("campaignBill", tidy(plan.campaignBill))} aria-invalid={campaignBillLow} />
                </div>
                {campaignBillLow && <p className={styles.fieldError}>The campaign bill should be higher than the normal bill.</p>}
              </div>
            </div>
            <Working>
              Increase: <strong>{formatINR(Math.max(0, bills.perBill))}</strong> per bill · {formatINR(Math.max(0, bills.perBill))} × {formatNumber(entries.entries)} entries = <strong>{formatINR(bills.extraSales)}</strong> extra sales
            </Working>
          </section>

          <section className={styles.section} aria-labelledby="calc-budget-title">
            <h2 className={styles.sectionTitle} id="calc-budget-title">3. Budget</h2>
            <NumberField id="calc-spend" label="Spend per entry" prefix="₹" value={plan.spendPerEntry} onChange={(v) => set("spendPerEntry", v)} hint="How much you want to spend on prizes for each person who enters." />
            <Working>
              {formatNumber(entries.entries)} entries × {formatINR(budget.spendPerEntry)} = <strong>{formatINR(budget.budget)} budget</strong>
            </Working>
          </section>

          <section className={styles.section} aria-labelledby="calc-pool-title">
            <div>
              <h2 className={styles.sectionTitle} id="calc-pool-title">4. Prize pool</h2>
              <p className={styles.hint}>One hero prize, a few mid-tier prizes and many smaller prizes. The 3rd prize is optional.</p>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Prize</th><th className={styles.num}>Winners</th><th className={styles.num}>Value each</th><th className={styles.num}>Total</th></tr></thead>
                <tbody>
                  {["grand", "second", "third"].map((level, i) => {
                    const row = pool.levels[i];
                    return (
                      <tr key={level}>
                        <td><strong>{PRIZE_LEVEL_LABEL[row.rank]}</strong></td>
                        <td className={styles.num}>
                          {level === "grand" ? "1" : (
                            <input aria-label={`${PRIZE_LEVEL_LABEL[row.rank]} winners`} className={styles.input} style={{ maxWidth: 90 }} inputMode="numeric" value={plan[level].quantity} onChange={(e) => setLevel(level, "quantity", e.target.value)} />
                          )}
                        </td>
                        <td className={styles.num}>
                          <div className={styles.moneyInput} style={{ maxWidth: 160, marginLeft: "auto" }}>
                            <span>₹</span>
                            <input aria-label={`${PRIZE_LEVEL_LABEL[row.rank]} value each`} className={styles.input} inputMode="numeric" value={plan[level].prizeValue} onChange={(e) => setLevel(level, "prizeValue", e.target.value)} onBlur={() => setLevel(level, "prizeValue", tidy(plan[level].prizeValue))} />
                          </div>
                        </td>
                        <td className={styles.num}><span className={styles.amount}>{row.total ? formatINR(row.total) : "—"}</span></td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td><strong>Total</strong></td>
                    <td className={styles.num}><strong>{formatNumber(pool.totalWinners)} winner{pool.totalWinners === 1 ? "" : "s"}</strong></td>
                    <td />
                    <td className={styles.num}><span className={styles.amount}>{formatINR(pool.totalCost)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className={`${styles.panel} ${styles.resultCard}`} aria-live="polite">
          <div className={styles.resultTop}>
            <small>Prize pool</small>
            <strong>{formatINR(pool.totalCost)}</strong>
            <span>For {formatNumber(pool.totalWinners)} winner{pool.totalWinners === 1 ? "" : "s"}</span>
          </div>
          {pool.budgetLeft != null && (
            <p className={pool.budgetLeft < 0 ? styles.error : styles.success} style={{ borderRadius: 0 }}>
              {pool.budgetLeft < 0 ? `${formatINR(-pool.budgetLeft)} over your budget` : `${formatINR(pool.budgetLeft)} of your budget left`}
            </p>
          )}
          <dl className={styles.facts}>
            <div><dt>Expected entries</dt><dd>{formatNumber(entries.entries)}</dd></div>
            <div><dt>Budget</dt><dd>{formatINR(budget.budget)}</dd></div>
            <div><dt>Extra sales</dt><dd>{formatINR(bills.extraSales)}</dd></div>
            <div><dt>Prizes as % of extra sales</dt><dd>{pool.shareOfExtraSales != null ? `${pool.shareOfExtraSales}%` : "—"}</dd></div>
            <div><dt>Chance to win</dt><dd>{pool.chanceOneIn != null ? `1 in ${formatNumber(pool.chanceOneIn)}` : "—"}</dd></div>
            <div><dt>Prize cost per entry</dt><dd>{pool.costPerEntry != null ? formatINR(pool.costPerEntry) : "—"}</dd></div>
          </dl>
          <div className={styles.panelFoot} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <Link href="/lucky-draws" className={styles.secondaryButton} style={{ justifyContent: "center" }}>Close calculator</Link>
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
