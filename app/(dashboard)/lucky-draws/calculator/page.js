"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Info, Receipt, Trophy, Users, Wallet } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import FieldError from "@/components/luckyDraw/FieldError";
import PageHead from "@/components/luckyDraw/PageHead";
import { levelIcon } from "@/components/luckyDraw/icons";
import { CALCULATOR_DEFAULTS, billIncrease, formatINR, formatNumber, parseAmount, planBudget, planEntries, prizePoolSummary } from "@/lib/luckyDraw/calculator";
import { prizeLevelLabel } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

/** Keeps what the owner typed but shows digits grouped the Indian way once they leave the field. */
const tidy = (value) => (parseAmount(value) ? formatNumber(parseAmount(value)) : "");

function NumberField({ id, label, value, onChange, prefix, hint, invalid = false, error = "" }) {
  const input = (
    <input id={id} className={`${styles.input} ${invalid ? styles.inputError : ""}`} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onChange(tidy(value))} aria-invalid={invalid} />
  );
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      {prefix ? <div className={styles.moneyInput}><span>{prefix}</span>{input}</div> : input}
      {hint && <p className={styles.hint}>{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

/** One step of the plan as a form card, in the style of the wizard's prize cards. */
function PlanCard({ id, icon: Icon, title, children }) {
  return (
    <section className={styles.prizeCard} aria-labelledby={id}>
      <header className={styles.prizeCardHead}>
        <span className={styles.prizeCardIcon}><Icon size={18} aria-hidden="true" /></span>
        <h2 className={styles.prizeCardTitle} id={id}>{title}</h2>
      </header>
      <div className={styles.prizeCardBody}>{children}</div>
    </section>
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
  const over = pool.budgetLeft != null && pool.budgetLeft < 0;
  const budgetLine = pool.budgetLeft == null ? "" : over ? `${formatINR(-pool.budgetLeft)} over your budget` : `${formatINR(pool.budgetLeft)} of your budget left`;

  return (
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <div className={styles.column}>
        <PageHead title="Prize calculator" back={{ href: "/lucky-draws", label: "Lucky draws" }} />

        <PlanCard id="calc-entries-title" icon={Users} title="Expected entries">
          <div className={styles.fieldPair}>
            <NumberField id="calc-walkins" label="Daily walk-ins" value={plan.dailyWalkIns} onChange={(v) => set("dailyWalkIns", v)} />
            <NumberField id="calc-extra" label="Extra footfall (%)" value={plan.extraPercent} onChange={(v) => set("extraPercent", v)} />
          </div>
          <NumberField id="calc-days" label="Duration (days)" value={plan.days} onChange={(v) => set("days", v)} />
          <Working>
            {formatNumber(entries.walkIns)} people/day + {entries.extra}% = {formatNumber(entries.perDay)} people × {formatNumber(entries.days)} days = <strong>{formatNumber(entries.entries)} entries</strong>
          </Working>
        </PlanCard>

        <PlanCard id="calc-bill-title" icon={Receipt} title="Bill size">
          <div className={styles.fieldPair}>
            <NumberField id="calc-normal" label="Normal average bill" prefix="₹" value={plan.normalBill} onChange={(v) => set("normalBill", v)} />
            <NumberField id="calc-campaign" label="Campaign average bill" prefix="₹" value={plan.campaignBill} onChange={(v) => set("campaignBill", v)} invalid={campaignBillLow} error={campaignBillLow ? "Should be higher than the normal bill." : ""} />
          </div>
          <Working>
            Increase: <strong>{formatINR(Math.max(0, bills.perBill))}</strong> per bill · {formatINR(Math.max(0, bills.perBill))} × {formatNumber(entries.entries)} entries = <strong>{formatINR(bills.extraSales)}</strong> extra sales
          </Working>
        </PlanCard>

        <PlanCard id="calc-budget-title" icon={Wallet} title="Budget">
          <NumberField id="calc-spend" label="Spend per entry" prefix="₹" value={plan.spendPerEntry} onChange={(v) => set("spendPerEntry", v)} />
          <Working>
            {formatNumber(entries.entries)} entries × {formatINR(budget.spendPerEntry)} = <strong>{formatINR(budget.budget)} budget</strong>
          </Working>
        </PlanCard>

        <PlanCard id="calc-pool-title" icon={Trophy} title="Prize pool">
          {["grand", "second", "third"].map((level, i) => {
            const row = pool.levels[i];
            const Icon = levelIcon(row.rank);
            const name = prizeLevelLabel(row.rank);
            return (
              <div key={level} className={styles.calcLevel}>
                <p className={styles.calcLevelName}><Icon size={16} aria-hidden="true" />{name}<span className={styles.amount}>{row.total ? formatINR(row.total) : "—"}</span></p>
                <div className={styles.prizeRowPair}>
                  <div className={styles.field}>
                    <label className={styles.subLabel} htmlFor={`calc-${level}-qty`}>Winners</label>
                    {level === "grand" ? (
                      <input id={`calc-${level}-qty`} className={styles.input} value="1" disabled />
                    ) : (
                      <input id={`calc-${level}-qty`} className={styles.input} inputMode="numeric" value={plan[level].quantity} onChange={(e) => setLevel(level, "quantity", e.target.value)} />
                    )}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.subLabel} htmlFor={`calc-${level}-value`}>Value each (₹)</label>
                    <div className={styles.moneyInput}>
                      <span>₹</span>
                      <input id={`calc-${level}-value`} className={styles.input} inputMode="numeric" value={plan[level].prizeValue} onChange={(e) => setLevel(level, "prizeValue", e.target.value)} onBlur={() => setLevel(level, "prizeValue", tidy(plan[level].prizeValue))} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </PlanCard>

        <section className={styles.summaryCard} aria-live="polite" aria-labelledby="calc-result-title">
          <h2 className={styles.summaryName} id="calc-result-title">Result</h2>
          <div className={styles.summaryPool}>
            <span>Prize pool</span>
            <strong>{formatINR(pool.totalCost)}</strong>
            <span className={styles.summaryPoolSub}>{formatNumber(pool.totalWinners)} winner{pool.totalWinners === 1 ? "" : "s"}</span>
          </div>
          {budgetLine && <p className={over ? styles.submitError : styles.okBox}>{budgetLine}</p>}
          <dl className={styles.factGrid}>
            <div><dt>Expected entries</dt><dd>{formatNumber(entries.entries)}</dd></div>
            <div><dt>Budget</dt><dd>{formatINR(budget.budget)}</dd></div>
            <div><dt>Extra sales</dt><dd>{formatINR(bills.extraSales)}</dd></div>
            <div><dt>Prizes as % of extra sales</dt><dd>{pool.shareOfExtraSales != null ? `${pool.shareOfExtraSales}%` : "—"}</dd></div>
            <div><dt>Chance to win</dt><dd>{pool.chanceOneIn != null ? `1 in ${formatNumber(pool.chanceOneIn)}` : "—"}</dd></div>
            <div><dt>Prize cost per entry</dt><dd>{pool.costPerEntry != null ? formatINR(pool.costPerEntry) : "—"}</dd></div>
          </dl>
        </section>

        {/* The running answer, pinned like the wizard's action bar so it stays in view while editing. */}
        <div className={`${styles.wizardFoot} ${styles.phoneFoot} ${styles.calcFoot}`}>
          <div>
            <strong>{formatINR(pool.totalCost)}</strong>
            <span className={over ? styles.calcFootOver : undefined}>{budgetLine || `${formatNumber(pool.totalWinners)} winners`}</span>
          </div>
          <Link href="/lucky-draws" className={styles.secondaryButton}>Done</Link>
        </div>
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
