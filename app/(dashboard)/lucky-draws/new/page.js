"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Calculator, Check, ClipboardList, Globe, ImagePlus, Info, ListOrdered, Pencil, Plus, Radio, Send, X } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api, describeRange, istInputToIso, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { dropTierRow, effectiveMode, formHints, prizeTierIndexes } from "@/lib/luckyDraw/prizeForm";
import { validatePrizeCategories, revealOrder } from "@/lib/luckyDraw/prizeCategories";
import { formatINR, formatNumber, parseAmount } from "@/lib/luckyDraw/calculator";
import { CALCULATOR_STORAGE_KEY, MODE_DESCRIPTION, MODE_LABEL, formatDayTime, pluralDays } from "@/lib/luckyDraw/display";
import { compressPrizeImage } from "@/lib/luckyDraw/imageCompress";
import styles from "../luckyDraws.module.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STEPS = ["Mode", "Details & dates", "Prizes", "Review"];
const DAY_MS = 24 * 60 * 60 * 1000;

const MODES = [
  { key: "online", icon: Globe, points: ["Customers enter with their bill on their phone", "Bigger bills can earn more entries", "Winners get an SMS with a claim code"] },
  { key: "manual_online_reveal", icon: Radio, points: ["Numbered slips handed out at the counter", "ScratchX picks the winning slips", "You reveal them live, one prize at a time"] },
  { key: "manual_offline_reveal", icon: ClipboardList, points: ["Numbered slips handed out at the counter", "You draw slips in front of customers", "You type in the winning slip numbers"] },
];

const blankPrize = () => ({ prizeDescription: "", prizeValue: "", quantity: "1", imageUrl: "", rows: [] });

const initialForm = {
  distributionMode: "online",
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  revealDate: "",
  storeIds: [],
  slipCount: "",
  tiers: [{ minAmount: "0", maxAmount: "", entriesGranted: "1" }],
  prizeMode: "shared",
  prizes: [blankPrize()],
  pool: "",
  maxEntries: "",
  scheduleType: "end_of_campaign",
  frequency: "daily",
  dayOfWeek: "1",
  time: "18:00",
  triggerMode: "automatic",
};

function Steps({ step }) {
  return (
    <ol className={styles.steps} aria-label="Steps">
      {STEPS.map((name, i) => {
        const n = i + 1;
        const state = n < step ? styles.stepDone : n === step ? styles.stepNow : "";
        return (
          <li key={name} className={`${styles.step} ${state}`} aria-current={n === step ? "step" : undefined}>
            <span className={styles.stepDot}>{n < step ? <Check size={16} aria-hidden="true" /> : n}</span>
            <span className={styles.stepName}>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Problems with the dates, keyed by field, from the IST strings in the form. */
function dateProblems(form) {
  const start = istInputToIso(form.startDate);
  const end = istInputToIso(form.endDate);
  const reveal = istInputToIso(form.revealDate);
  const problems = {};
  if (!start) problems.startDate = "Pick when entries open.";
  if (!end) problems.endDate = "Pick when entries close.";
  else if (start && new Date(end) <= new Date(start)) problems.endDate = "Entries must close after they open.";
  if (!reveal) problems.revealDate = "Pick when winners are revealed.";
  else if (end && new Date(reveal) < new Date(end)) problems.revealDate = "Winners can only be revealed after entries close.";
  return problems;
}

function NewLuckyDrawForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [stores, setStores] = useState([]);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [fromCalculator, setFromCalculator] = useState(false);
  const [imageBusy, setImageBusy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Defaults and calculator prizes are applied after the first render, so server and client markup match.
    const applyDefaults = () =>
      setForm((f) => {
        const now = Date.now();
        const next = {
          ...f,
          startDate: f.startDate || toISTInputValue(new Date(now)),
          endDate: f.endDate || toISTInputValue(new Date(now + 30 * DAY_MS)),
          revealDate: f.revealDate || toISTInputValue(new Date(now + 32 * DAY_MS)),
        };
        if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "calculator") {
          try {
            const saved = JSON.parse(window.sessionStorage.getItem(CALCULATOR_STORAGE_KEY) || "[]");
            if (Array.isArray(saved) && saved.length) {
              next.prizes = saved.map((p) => ({ ...blankPrize(), prizeDescription: p.prizeDescription, prizeValue: formatNumber(p.prizeValue), quantity: String(p.quantity) }));
              setFromCalculator(true);
            }
          } catch {
            // Ignore unreadable storage; the owner can type the prizes.
          }
        }
        return next;
      });

    api("/api/stores?limit=100&status=active")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.stores || [];
        setStores(list);
        if (list.length === 1) setForm((f) => (f.storeIds.length ? f : { ...f, storeIds: [list[0]._id] }));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && applyDefaults());
    return () => {
      cancelled = true;
    };
  }, []);

  const online = form.distributionMode === "online";
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setRow = (key, index, patch) => setForm((f) => ({ ...f, [key]: f[key].map((row, i) => (i === index ? { ...row, ...patch } : row)) }));
  const addRow = (key, row) => setForm((f) => ({ ...f, [key]: [...f[key], row] }));
  const removeRow = (key, index) => setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  const removeTier = (index) => setForm((f) => ({ ...f, tiers: f.tiers.filter((_, i) => i !== index), prizes: dropTierRow(f.prizes, index) }));
  const movePrize = (index, delta) =>
    setForm((f) => {
      const list = [...f.prizes];
      const target = index + delta;
      if (target < 0 || target >= list.length) return f;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...f, prizes: list };
    });
  const setPrizeMode = (mode) =>
    setForm((f) => ({ ...f, prizeMode: mode, prizes: f.prizes.map((p) => (mode === "pool_per_tier" ? { ...p, rows: p.rows.length ? [p.rows[0]] : [0] } : p)) }));
  const togglePrizeRow = (prizeIndex, row) => {
    const current = form.prizes[prizeIndex].rows;
    setRow("prizes", prizeIndex, { rows: current.includes(row) ? current.filter((r) => r !== row) : [...current, row] });
  };
  const toggleStore = (id) => setForm((f) => ({ ...f, storeIds: f.storeIds.includes(id) ? f.storeIds.filter((s) => s !== id) : [...f.storeIds, id] }));

  const tierMode = effectiveMode(form.prizeMode, form.tiers.length);
  const hints = formHints({ tiers: form.tiers, maxEntries: form.maxEntries });
  const rangeLabel = (tier, i) =>
    `Range ${i + 1}: ${tier.minAmount === "" ? "fill in the range above" : describeRange({ minAmount: Number(tier.minAmount), maxAmount: tier.maxAmount === "" ? null : Number(tier.maxAmount) })}`;

  const prizesForApi = () =>
    form.prizes.map((p) => ({
      prizeDescription: p.prizeDescription,
      prizeValue: parseAmount(p.prizeValue),
      quantity: parseAmount(p.quantity),
      imageUrl: p.imageUrl || null,
      tierIndexes: online && tierMode !== "shared" ? prizeTierIndexes(p.rows, form.tiers) : [],
    }));
  const totalValue = form.prizes.reduce((sum, p) => sum + parseAmount(p.prizeValue) * parseAmount(p.quantity), 0);
  const totalWinners = form.prizes.reduce((sum, p) => sum + parseAmount(p.quantity), 0);
  const poolTarget = parseAmount(form.pool);

  const dates = dateProblems(form);
  const step2Problem = () => {
    if (form.name.trim().length < 3) return "Give the lucky draw a name of at least 3 characters.";
    if (form.storeIds.length === 0) return "Choose at least one store.";
    if (Object.keys(dates).length) return "Fix the dates below.";
    if (!online && form.slipCount !== "" && !(Number.isInteger(Number(form.slipCount)) && Number(form.slipCount) >= 0)) return "Enter the slips handed out as a whole number.";
    return "";
  };
  const step3Problem = () => {
    const problem = validatePrizeCategories(prizesForApi());
    if (problem) return problem;
    if (poolTarget && totalValue !== poolTarget) {
      return `The prizes add up to ${formatINR(totalValue)}, not your prize pool of ${formatINR(poolTarget)}. Change a prize or the pool.`;
    }
    return "";
  };

  const goTo = (next) => {
    setError("");
    const problem = step === 2 && next > 2 ? step2Problem() : step === 3 && next > 3 ? step3Problem() : "";
    if (problem) {
      setShowErrors(true);
      setError(problem);
      return;
    }
    setShowErrors(false);
    setStep(next);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  async function pickImage(index, file) {
    if (!file) return;
    setImageBusy(index);
    setError("");
    try {
      setRow("prizes", index, { imageUrl: await compressPrizeImage(file) });
    } catch (err) {
      setError(err.message);
    } finally {
      setImageBusy(null);
    }
  }

  function buildBody() {
    const body = {
      distributionMode: form.distributionMode,
      name: form.name,
      description: form.description,
      startDate: istInputToIso(form.startDate),
      endDate: istInputToIso(form.endDate),
      revealDate: istInputToIso(form.revealDate),
      storeIds: form.storeIds,
      prizes: prizesForApi(),
    };
    if (!online) {
      body.slipCount = form.slipCount === "" ? 0 : Number(form.slipCount);
      return body;
    }
    Object.assign(body, {
      entryTiers: form.tiers.map((t) => ({ minAmount: Number(t.minAmount), maxAmount: t.maxAmount === "" ? null : Number(t.maxAmount), entriesGranted: Number(t.entriesGranted) })),
      prizeMode: tierMode,
      maxEntriesPerCustomerPerPeriod: form.maxEntries === "" ? null : Number(form.maxEntries),
      scheduleType: form.scheduleType,
      triggerMode: form.triggerMode,
    });
    if (form.scheduleType === "recurring") {
      body.recurrence = { frequency: form.frequency, time: form.time, dayOfWeek: form.frequency === "weekly" ? Number(form.dayOfWeek) : null };
    }
    return body;
  }

  async function save(publish) {
    setError("");
    setSaving(publish ? "publish" : "draft");
    let created;
    try {
      created = await api("/api/lucky-draws/campaigns", { method: "POST", body: buildBody() });
    } catch (err) {
      setError(err.message);
      setSaving("");
      return;
    }
    if (!publish) {
      router.push(`/lucky-draws/${created._id}`);
      return;
    }
    try {
      await api(`/api/lucky-draws/campaigns/${created._id}/status`, { method: "PATCH", body: { status: "active" } });
      router.push(`/lucky-draws/${created._id}?published=1`);
    } catch (err) {
      // Saved, but could not go live (for example the plan's campaign limit): show it on its page.
      router.push(`/lucky-draws/${created._id}?notPublished=${encodeURIComponent(err.message)}`);
    }
  }

  const fieldClass = (key) => `${styles.input} ${showErrors && dates[key] ? styles.inputError : ""}`;
  const revealRanks = revealOrder(form.prizes.map((p, i) => ({ rank: i + 1, prizeValue: parseAmount(p.prizeValue) })));
  const start = istInputToIso(form.startDate);
  const end = istInputToIso(form.endDate);
  const reveal = istInputToIso(form.revealDate);
  const entryDays = start && end ? Math.max(1, Math.round((new Date(end) - new Date(start)) / DAY_MS)) : null;
  const gapDays = end && reveal ? Math.round((new Date(reveal) - new Date(end)) / DAY_MS) : null;

  return (
    <div className={styles.container}>
      <div className={styles.wizard}>
        <Link href="/lucky-draws" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />Cancel</Link>
        <div>
          <h1 className={styles.title}>{["New lucky draw", "Details and dates", "Prizes", "Review and publish"][step - 1]}</h1>
          <p className={styles.subtitle}>
            {[
              "Start by choosing how customers enter and how winners are picked.",
              "Name the draw, choose your stores, and set the three dates.",
              "Add each prize with a picture, its value and how many winners get it. List the biggest prize first.",
              "Check everything once more. After publishing, dates can only be extended.",
            ][step - 1]}
          </p>
        </div>
        <Steps step={step} />

        {error && <p className={styles.error} role="alert">{error}</p>}

        {step === 1 && (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="visually-hidden" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>How the draw works</legend>
              <div className={styles.modeGrid}>
                {MODES.map(({ key, icon: Icon, points }) => (
                  <label key={key} className={styles.modeCard}>
                    <input type="radio" name="distributionMode" checked={form.distributionMode === key} onChange={() => set("distributionMode", key)} />
                    <span className={styles.modeIcon}><Icon size={20} aria-hidden="true" /></span>
                    <span className={styles.modeTitle}>{MODE_LABEL[key]}</span>
                    <span className={styles.muted}>{MODE_DESCRIPTION[key]}</span>
                    <ul className={styles.modeList}>
                      {points.map((p) => <li key={p}><Check size={15} aria-hidden="true" />{p}</li>)}
                    </ul>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className={styles.info}><Info size={16} aria-hidden="true" />You can&rsquo;t change the mode after the draw is published.</p>
          </>
        )}

        {step === 2 && (
          <>
            <section className={styles.section}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ld-name">Draw name</label>
                <input id="ld-name" className={`${styles.input} ${showErrors && form.name.trim().length < 3 ? styles.inputError : ""}`} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="e.g. Diwali Dhamaka Lucky Draw" />
                <p className={styles.hint}>Customers see this on the entry page and the reveal.</p>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ld-desc">Description (optional)</label>
                <textarea id="ld-desc" className={styles.input} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
              </div>
              <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className={styles.label} style={{ marginBottom: 6 }}>{online ? "Stores taking entries" : "Stores handing out slips"}</legend>
                {stores.length === 0 && <p className={styles.muted}>No active stores found. Add a store first.</p>}
                <div className={styles.chips}>
                  {stores.map((store) => (
                    <button key={store._id} type="button" aria-pressed={form.storeIds.includes(store._id)} className={`${styles.chipButton} ${form.storeIds.includes(store._id) ? styles.chipOn : ""}`} onClick={() => toggleStore(store._id)}>
                      {store.store_name}
                    </button>
                  ))}
                </div>
                {online && <p className={styles.hint}>Online entry checks the customer is at the store, so each store needs a location.</p>}
              </fieldset>
              {!online && (
                <div className={styles.field} style={{ maxWidth: 280 }}>
                  <label className={styles.label} htmlFor="ld-slips">Slips handed out so far (optional)</label>
                  <input id="ld-slips" className={styles.input} inputMode="numeric" value={form.slipCount} onChange={(e) => set("slipCount", e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
                  <p className={styles.hint}>Slips are numbered from 0001. You can update this any time before the reveal.</p>
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>Dates</h2>
                <p className={styles.hint}>Entries close before the reveal. After publishing you can extend dates, but never move them earlier. Times are IST.</p>
              </div>
              <div className={styles.dateGrid}>
                {[
                  ["startDate", 1, "Entries open"],
                  ["endDate", 2, "Entries close"],
                  ["revealDate", 3, "Winners revealed"],
                ].map(([key, n, label]) => (
                  <div key={key} className={styles.dateCard}>
                    <label className={styles.dateCardHead} htmlFor={`ld-${key}`}><span className={styles.dateNum}>{n}</span>{label}</label>
                    <input id={`ld-${key}`} type="datetime-local" className={fieldClass(key)} value={form[key]} onChange={(e) => set(key, e.target.value)} aria-invalid={showErrors && !!dates[key]} />
                    {showErrors && dates[key] && <p className={styles.fieldError}>{dates[key]}</p>}
                  </div>
                ))}
              </div>
              {start && end && reveal && !Object.keys(dates).length && (
                <div className={styles.timeline} aria-label="Date preview" style={{ paddingTop: 6 }}>
                  <div className={styles.tlTrack}>
                    <span className={styles.tlFill} style={{ width: `${(entryDays / (entryDays + Math.max(gapDays, 0.5))) * 100}%` }} />
                    <span className={styles.tlNode} style={{ left: 0 }} />
                    <span className={styles.tlNode} style={{ left: `${(entryDays / (entryDays + Math.max(gapDays, 0.5))) * 100}%` }} />
                    <span className={`${styles.tlNode} ${styles.tlReveal}`} style={{ left: "100%" }} />
                  </div>
                  <div className={styles.tlLegend}>
                    <div><small>Entries open</small><b>{formatDayTime(start)}</b></div>
                    <div><small>{pluralDays(entryDays)} of entries · close</small><b>{formatDayTime(end)}</b></div>
                    <div><small>{gapDays > 0 ? `${pluralDays(gapDays)} later · reveal` : "Reveal"}</small><b>{formatDayTime(reveal)}</b></div>
                  </div>
                </div>
              )}
            </section>

            {online && (
              <>
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Entries per bill</h2>
                  <p className={styles.hint}>Bigger bills can earn more entries. A range includes its minimum and stops just below its maximum. Leave the maximum empty for &ldquo;and above&rdquo;.</p>
                  {form.tiers.map((tier, index) => (
                    <div key={index} className={styles.tierRow}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`ld-tmin-${index}`}>Bill from (₹)</label>
                        <input id={`ld-tmin-${index}`} type="number" min="0" className={styles.input} value={tier.minAmount} onChange={(e) => setRow("tiers", index, { minAmount: e.target.value })} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`ld-tmax-${index}`}>Up to (₹)</label>
                        <input id={`ld-tmax-${index}`} type="number" min="0" className={styles.input} value={tier.maxAmount} onChange={(e) => setRow("tiers", index, { maxAmount: e.target.value })} placeholder="No limit" />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`ld-tent-${index}`}>Entries</label>
                        <input id={`ld-tent-${index}`} type="number" min="1" step="1" className={styles.input} value={tier.entriesGranted} onChange={(e) => setRow("tiers", index, { entriesGranted: e.target.value })} />
                      </div>
                      {form.tiers.length > 1 && <button type="button" className={styles.secondaryButton} onClick={() => removeTier(index)}>Remove</button>}
                    </div>
                  ))}
                  <div><button type="button" className={styles.secondaryButton} onClick={() => addRow("tiers", { minAmount: "", maxAmount: "", entriesGranted: "1" })}><Plus size={15} aria-hidden="true" />Add a range</button></div>
                  <div className={styles.field} style={{ maxWidth: 360 }}>
                    <label className={styles.label} htmlFor="ld-max">Most entries one customer can hold per draw (optional)</label>
                    <input id="ld-max" type="number" min="1" step="1" className={styles.input} value={form.maxEntries} onChange={(e) => set("maxEntries", e.target.value)} placeholder="No limit" />
                  </div>
                  {hints.map((hint) => <p key={hint} className={styles.notice} role="note">{hint}</p>)}
                </section>

                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>When are winners drawn?</h2>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioCard}>
                      <input type="radio" name="schedule" checked={form.scheduleType === "end_of_campaign"} onChange={() => set("scheduleType", "end_of_campaign")} />
                      <span><strong>Once, on the reveal date</strong><br /><span className={styles.hint}>One draw for everyone who entered.</span></span>
                    </label>
                    <label className={styles.radioCard}>
                      <input type="radio" name="schedule" checked={form.scheduleType === "recurring"} onChange={() => set("scheduleType", "recurring")} />
                      <span><strong>On a schedule while entries are open</strong><br /><span className={styles.hint}>Each draw only uses entries made since the previous draw.</span></span>
                    </label>
                  </div>
                  {form.scheduleType === "recurring" && (
                    <div className={styles.row}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="ld-freq">Repeat</label>
                        <select id="ld-freq" className={styles.input} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
                          <option value="daily">Every day</option>
                          <option value="weekly">Every week</option>
                        </select>
                      </div>
                      {form.frequency === "weekly" && (
                        <div className={styles.field}>
                          <label className={styles.label} htmlFor="ld-dow">On</label>
                          <select id="ld-dow" className={styles.input} value={form.dayOfWeek} onChange={(e) => set("dayOfWeek", e.target.value)}>
                            {WEEKDAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
                          </select>
                        </div>
                      )}
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="ld-time">At (IST)</label>
                        <input id="ld-time" type="time" className={styles.input} value={form.time} onChange={(e) => set("time", e.target.value)} />
                      </div>
                    </div>
                  )}
                  <h3 className={styles.subTitle} style={{ marginTop: 6 }}>Who runs the draw?</h3>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioCard}>
                      <input type="radio" name="trigger" checked={form.triggerMode === "automatic"} onChange={() => set("triggerMode", "automatic")} />
                      <span><strong>Automatic</strong><br /><span className={styles.hint}>The draw runs by itself on its date. You can still run it early or extend the date.</span></span>
                    </label>
                    <label className={styles.radioCard}>
                      <input type="radio" name="trigger" checked={form.triggerMode === "manual"} onChange={() => set("triggerMode", "manual")} />
                      <span><strong>I&rsquo;ll run it</strong><br /><span className={styles.hint}>Nothing happens on the date. You press &ldquo;Run draw&rdquo; when you are ready.</span></span>
                    </label>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            {fromCalculator && <p className={styles.notice} role="note">Filled in from the <strong>prize calculator</strong>. Add pictures and change anything you need.</p>}
            <section className={styles.section}>
              <div className={styles.field} style={{ maxWidth: 280 }}>
                <label className={styles.label} htmlFor="ld-pool">Prize pool (optional)</label>
                <div className={styles.moneyInput}>
                  <span>₹</span>
                  <input id="ld-pool" className={styles.input} inputMode="numeric" value={form.pool} onChange={(e) => set("pool", e.target.value)} onBlur={() => set("pool", parseAmount(form.pool) ? formatNumber(parseAmount(form.pool)) : "")} placeholder="Any amount" />
                </div>
                <p className={styles.hint}>If you set one, the prizes must add up to it.</p>
              </div>

              <div className={styles.prizeEditor}>
                {form.prizes.map((prize, index) => {
                  const lineTotal = parseAmount(prize.prizeValue) * parseAmount(prize.quantity);
                  return (
                    <div key={index}>
                      <div className={styles.prizeLine}>
                        <div className={styles.field}>
                          <span className={styles.label} id={`ld-pimg-${index}`}>Picture</span>
                          <label className={styles.imagePick} aria-labelledby={`ld-pimg-${index}`}>
                            {prize.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={prize.imageUrl} alt={`${prize.prizeDescription || "Prize"} picture`} />
                            ) : imageBusy === index ? (
                              "Adding…"
                            ) : (
                              <span style={{ display: "grid", justifyItems: "center", gap: 2 }}><ImagePlus size={20} aria-hidden="true" />Add</span>
                            )}
                            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Picture for ${prize.prizeDescription || `prize ${index + 1}`}`} onChange={(e) => pickImage(index, e.target.files?.[0])} />
                          </label>
                          {prize.imageUrl && (
                            <button type="button" className={styles.ghostButton} style={{ padding: "2px 4px", fontSize: "0.8rem" }} onClick={() => setRow("prizes", index, { imageUrl: "" })}>Remove</button>
                          )}
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label} htmlFor={`ld-pname-${index}`}>Prize name</label>
                          <input id={`ld-pname-${index}`} className={styles.input} value={prize.prizeDescription} onChange={(e) => setRow("prizes", index, { prizeDescription: e.target.value })} placeholder={index === 0 ? "e.g. 43-inch Smart TV" : "e.g. Gold coin"} maxLength={200} />
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label} htmlFor={`ld-pqty-${index}`}>Winners</label>
                          <input id={`ld-pqty-${index}`} className={styles.input} inputMode="numeric" value={prize.quantity} onChange={(e) => setRow("prizes", index, { quantity: e.target.value.replace(/[^\d]/g, "") })} />
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label} htmlFor={`ld-pval-${index}`}>Value each</label>
                          <div className={styles.moneyInput}>
                            <span>₹</span>
                            <input id={`ld-pval-${index}`} className={styles.input} inputMode="numeric" value={prize.prizeValue} onChange={(e) => setRow("prizes", index, { prizeValue: e.target.value })} onBlur={() => setRow("prizes", index, { prizeValue: parseAmount(prize.prizeValue) ? formatNumber(parseAmount(prize.prizeValue)) : "" })} />
                          </div>
                        </div>
                        <div className={styles.lineTotal} aria-label="Prize total">{lineTotal ? formatINR(lineTotal) : "—"}</div>
                        <div style={{ display: "flex", gap: 2, paddingBottom: 6 }}>
                          <button type="button" className={styles.ghostButton} aria-label="Move up" disabled={index === 0} onClick={() => movePrize(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button>
                          <button type="button" className={styles.ghostButton} aria-label="Move down" disabled={index === form.prizes.length - 1} onClick={() => movePrize(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button>
                          {form.prizes.length > 1 && <button type="button" className={styles.ghostButton} aria-label={`Remove ${prize.prizeDescription || "this prize"}`} onClick={() => removeRow("prizes", index)}><X size={16} aria-hidden="true" /></button>}
                        </div>
                      </div>

                      {online && tierMode === "pool_per_tier" && (
                        <div className={styles.field} style={{ marginBottom: 10 }}>
                          <label className={styles.label} htmlFor={`ld-ps-${index}`}>Won by customers in</label>
                          <select id={`ld-ps-${index}`} className={styles.input} value={prize.rows[0] ?? 0} onChange={(e) => setRow("prizes", index, { rows: [Number(e.target.value)] })}>
                            {form.tiers.map((tier, i) => <option key={i} value={i}>{rangeLabel(tier, i)}</option>)}
                          </select>
                        </div>
                      )}
                      {online && tierMode === "restricted" && (
                        <fieldset className={styles.scope} style={{ marginBottom: 10 }}>
                          <legend className={styles.label}>Open to (tick none for everyone)</legend>
                          {form.tiers.map((tier, i) => (
                            <label key={i} className={styles.checkRow}>
                              <input type="checkbox" checked={prize.rows.includes(i)} onChange={() => togglePrizeRow(index, i)} />
                              <span>{rangeLabel(tier, i)}</span>
                            </label>
                          ))}
                        </fieldset>
                      )}
                    </div>
                  );
                })}
              </div>
              <div><button type="button" className={`${styles.secondaryButton} ${styles.smallButton}`} onClick={() => addRow("prizes", { ...blankPrize(), rows: online && tierMode === "pool_per_tier" ? [0] : [] })}><Plus size={15} aria-hidden="true" />Add prize</button></div>

              {totalWinners > 0 && (
                <div className={`${styles.alloc} ${poolTarget && totalValue !== poolTarget ? styles.allocOver : ""}`}>
                  <div className={styles.allocTop}>
                    <span>
                      {poolTarget
                        ? totalValue === poolTarget
                          ? "All of the prize pool is allocated"
                          : totalValue > poolTarget
                            ? `${formatINR(totalValue - poolTarget)} more than the prize pool`
                            : `${formatINR(poolTarget - totalValue)} of the prize pool left`
                        : "Total prize cost"}
                    </span>
                    <b>{formatINR(totalValue)}{poolTarget ? ` of ${formatINR(poolTarget)}` : ""} · {formatNumber(totalWinners)} winner{totalWinners === 1 ? "" : "s"}</b>
                  </div>
                  {totalValue > 0 && (
                    <div className={styles.allocBar} aria-hidden="true">
                      {form.prizes.map((p, i) => <i key={i} style={{ width: `${((parseAmount(p.prizeValue) * parseAmount(p.quantity)) / Math.max(totalValue, poolTarget)) * 100}%` }} />)}
                    </div>
                  )}
                </div>
              )}
            </section>

            {online && form.tiers.length >= 2 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Prizes and bill ranges</h2>
                <div className={styles.radioGroup}>
                  <label className={styles.radioCard}>
                    <input type="radio" name="prizeMode" checked={tierMode === "shared"} onChange={() => setPrizeMode("shared")} />
                    <span><strong>Same prizes for everyone</strong><br /><span className={styles.hint}>A bigger bill only earns more entries.</span></span>
                  </label>
                  <label className={styles.radioCard}>
                    <input type="radio" name="prizeMode" checked={tierMode === "pool_per_tier"} onChange={() => setPrizeMode("pool_per_tier")} />
                    <span><strong>A separate prize pool for each bill range</strong><br /><span className={styles.hint}>Choose the range for every prize above.</span></span>
                  </label>
                  <label className={styles.radioCard}>
                    <input type="radio" name="prizeMode" checked={tierMode === "restricted"} onChange={() => setPrizeMode("restricted")} />
                    <span><strong>Some prizes only for certain ranges</strong><br /><span className={styles.hint}>Reserve a prize for bigger bills. A prize with no range ticked is open to everyone.</span></span>
                  </label>
                </div>
              </section>
            )}

            {form.prizes.length > 1 && (
              <p className={styles.info}><ListOrdered size={16} aria-hidden="true" />
                Reveal order on draw day: {revealRanks.map((rank, i) => (
                  <React.Fragment key={rank}>{i > 0 && (i === revealRanks.length - 1 ? ", then " : ", ")}<strong>{form.prizes[rank - 1].prizeDescription || `Prize ${rank}`}</strong></React.Fragment>
                ))} last. A customer can win only once.
              </p>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <div className={`${styles.panel} ${styles.review}`}>
              <section>
                <h3>Mode</h3>
                <dl><div><dd>{MODE_LABEL[form.distributionMode]}</dd></div></dl>
                <button type="button" className={styles.ghostButton} onClick={() => setStep(1)}><Pencil size={14} aria-hidden="true" />Edit</button>
              </section>
              <section>
                <h3>Details</h3>
                <dl>
                  <div><dt>Name</dt><dd>{form.name}</dd></div>
                  <div><dt>Stores</dt><dd>{stores.filter((s) => form.storeIds.includes(s._id)).map((s) => s.store_name).join(", ") || "—"}</dd></div>
                  {online ? (
                    <div><dt>Who can enter</dt><dd>{form.tiers.map((t) => describeRange({ minAmount: Number(t.minAmount), maxAmount: t.maxAmount === "" ? null : Number(t.maxAmount) })).join("; ")}</dd></div>
                  ) : (
                    <div><dt>Slips handed out</dt><dd>{form.slipCount ? formatNumber(Number(form.slipCount)) : "None yet"}</dd></div>
                  )}
                </dl>
                <button type="button" className={styles.ghostButton} onClick={() => setStep(2)}><Pencil size={14} aria-hidden="true" />Edit</button>
              </section>
              <section>
                <h3>Dates</h3>
                <dl>
                  <div><dt>Entries open</dt><dd>{formatDayTime(start)}</dd></div>
                  <div><dt>Entries close</dt><dd>{formatDayTime(end)}</dd></div>
                  <div><dt>Winners revealed</dt><dd>{formatDayTime(reveal)}</dd></div>
                </dl>
                <button type="button" className={styles.ghostButton} onClick={() => setStep(2)}><Pencil size={14} aria-hidden="true" />Edit</button>
              </section>
              <section>
                <h3>Prizes</h3>
                <dl>
                  {form.prizes.map((p, i) => (
                    <div key={i}><dt>{p.prizeDescription}</dt><dd>{formatNumber(parseAmount(p.quantity))} × {formatINR(parseAmount(p.prizeValue))}{p.imageUrl ? " · with picture" : ""}</dd></div>
                  ))}
                  <div><dt>Total</dt><dd>{formatINR(totalValue)} for {formatNumber(totalWinners)} winner{totalWinners === 1 ? "" : "s"}</dd></div>
                </dl>
                <button type="button" className={styles.ghostButton} onClick={() => setStep(3)}><Pencil size={14} aria-hidden="true" />Edit</button>
              </section>
            </div>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>I confirm my store will give these prizes to the winners.</span>
            </label>
          </>
        )}

        <div className={styles.wizardFoot}>
          {step === 1 ? (
            <Link href="/lucky-draws/calculator" className={styles.ghostButton}><Calculator size={16} aria-hidden="true" />Check the cost first</Link>
          ) : (
            <button type="button" className={styles.ghostButton} onClick={() => goTo(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Back</button>
          )}
          {step < 4 ? (
            <button type="button" className={styles.primaryButton} onClick={() => goTo(step + 1)}>Continue<ArrowRight size={16} aria-hidden="true" /></button>
          ) : (
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} disabled={saving !== ""} onClick={() => save(false)}>{saving === "draft" ? "Saving…" : "Save as draft"}</button>
              <button type="button" className={styles.primaryButton} disabled={saving !== "" || !confirmed} onClick={() => save(true)}>
                <Send size={16} aria-hidden="true" />{saving === "publish" ? "Publishing…" : "Publish lucky draw"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewLuckyDrawPage() {
  return (
    <FlagGate>
      <NewLuckyDrawForm />
    </FlagGate>
  );
}
