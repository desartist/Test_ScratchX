"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api, describeRange, istInputToIso, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { dropTierRow, effectiveMode, formHints, prizeTierIndexes } from "@/lib/luckyDraw/prizeForm";
import styles from "../luckyDraws.module.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const initialForm = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  storeIds: [],
  tiers: [{ minAmount: "0", maxAmount: "", entriesGranted: "1" }],
  prizeMode: "shared",
  prizes: [{ prizeDescription: "", prizeValue: "", rows: [] }],
  maxEntries: "",
  scheduleType: "end_of_campaign",
  frequency: "daily",
  dayOfWeek: "1",
  time: "18:00",
  triggerMode: "automatic",
};

function NewLuckyDrawForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [stores, setStores] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Date defaults are applied once the stores request settles (success or failure), so server
    // and client markup match on first render and setState only runs in async callbacks.
    const applyDefaults = () =>
      setForm((f) => ({
        ...f,
        startDate: f.startDate || toISTInputValue(new Date()),
        endDate: f.endDate || toISTInputValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      }));

    api("/api/stores?limit=100&status=active")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.stores || [];
        setStores(list);
        // A merchant with a single store almost certainly means that one: preselect it.
        if (list.length === 1) setForm((f) => (f.storeIds.length ? f : { ...f, storeIds: [list[0]._id] }));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && applyDefaults());
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setRow = (key, index, patch) =>
    setForm((f) => ({ ...f, [key]: f[key].map((row, i) => (i === index ? { ...row, ...patch } : row)) }));
  const addRow = (key, row) => setForm((f) => ({ ...f, [key]: [...f[key], row] }));
  const removeRow = (key, index) => setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  const removeTier = (index) =>
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, i) => i !== index), prizes: dropTierRow(f.prizes, index) }));
  const setPrizeMode = (mode) =>
    setForm((f) => ({
      ...f,
      prizeMode: mode,
      // A separate pool needs exactly one range per prize; default to the first.
      prizes: f.prizes.map((p) => {
        if (mode !== "pool_per_tier") return p;
        return { ...p, rows: p.rows.length ? [p.rows[0]] : [0] };
      }),
    }));
  const setPrizeRows = (prizeIndex, rows) =>
    setForm((f) => ({ ...f, prizes: f.prizes.map((p, i) => (i === prizeIndex ? { ...p, rows } : p)) }));
  const togglePrizeRow = (prizeIndex, row) => {
    const current = form.prizes[prizeIndex].rows;
    setPrizeRows(prizeIndex, current.includes(row) ? current.filter((r) => r !== row) : [...current, row]);
  };
  const rangeLabel = (tier, i) =>
    `Range ${i + 1}: ${
      tier.minAmount === ""
        ? "fill in the range above"
        : describeRange({ minAmount: Number(tier.minAmount), maxAmount: tier.maxAmount === "" ? null : Number(tier.maxAmount) })
    }`;
  const mode = effectiveMode(form.prizeMode, form.tiers.length);
  const hints = formHints({ tiers: form.tiers, maxEntries: form.maxEntries });

  const toggleStore = (id) =>
    setForm((f) => ({
      ...f,
      storeIds: f.storeIds.includes(id) ? f.storeIds.filter((s) => s !== id) : [...f.storeIds, id],
    }));

  async function submit(event) {
    event.preventDefault();
    setError("");

    const startDate = istInputToIso(form.startDate);
    const endDate = istInputToIso(form.endDate);
    if (!startDate || !endDate) {
      setError("Enter valid start and end dates");
      return;
    }

    const body = {
      name: form.name,
      description: form.description,
      startDate,
      endDate,
      storeIds: form.storeIds,
      entryTiers: form.tiers.map((t) => ({
        minAmount: Number(t.minAmount),
        maxAmount: t.maxAmount === "" ? null : Number(t.maxAmount),
        entriesGranted: Number(t.entriesGranted),
      })),
      prizeMode: mode,
      prizes: form.prizes.map((p) => ({
        prizeDescription: p.prizeDescription,
        prizeValue: p.prizeValue === "" ? 0 : Number(p.prizeValue),
        tierIndexes: mode === "shared" ? [] : prizeTierIndexes(p.rows, form.tiers),
      })),
      maxEntriesPerCustomerPerPeriod: form.maxEntries === "" ? null : Number(form.maxEntries),
      scheduleType: form.scheduleType,
      triggerMode: form.triggerMode,
    };
    if (form.scheduleType === "recurring") {
      body.recurrence = {
        frequency: form.frequency,
        time: form.time,
        dayOfWeek: form.frequency === "weekly" ? Number(form.dayOfWeek) : null,
      };
    }

    setSaving(true);
    try {
      const created = await api("/api/lucky-draws/campaigns", { method: "POST", body });
      router.push(`/lucky-draws/${created._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>New Lucky Draw</h1>
          <p className={styles.subtitle}>It is saved as a draft. You activate it from its page when you are ready.</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error} role="alert">{error}</p>}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Basics</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ld-name">Name</label>
            <input id="ld-name" className={styles.input} value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={3} maxLength={120} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ld-desc">Description (shown to customers)</label>
            <textarea id="ld-desc" className={styles.input} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ld-start">Starts (IST)</label>
              <input id="ld-start" type="datetime-local" className={styles.input} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ld-end">Entries close (IST)</label>
              <input id="ld-end" type="datetime-local" className={styles.input} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Stores</h2>
          {stores.length === 0 && <p className={styles.muted}>No active stores found. Add a store with a location first.</p>}
          {stores.map((store) => (
            <label key={store._id} className={styles.checkRow}>
              <input type="checkbox" checked={form.storeIds.includes(store._id)} onChange={() => toggleStore(store._id)} />
              <span>{store.store_name}</span>
            </label>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Entries per bill</h2>
          <p className={styles.hint}>Bigger bills can earn more entries. A range includes its minimum and stops just below its maximum. Leave the maximum empty for &ldquo;and above&rdquo;.</p>
          {form.tiers.map((tier, index) => (
            <div key={index} className={styles.tierRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`ld-tmin-${index}`}>Bill from (₹)</label>
                <input id={`ld-tmin-${index}`} type="number" min="0" className={styles.input} value={tier.minAmount} onChange={(e) => setRow("tiers", index, { minAmount: e.target.value })} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`ld-tmax-${index}`}>Up to (₹)</label>
                <input id={`ld-tmax-${index}`} type="number" min="0" className={styles.input} value={tier.maxAmount} onChange={(e) => setRow("tiers", index, { maxAmount: e.target.value })} placeholder="No limit" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`ld-tent-${index}`}>Entries</label>
                <input id={`ld-tent-${index}`} type="number" min="1" step="1" className={styles.input} value={tier.entriesGranted} onChange={(e) => setRow("tiers", index, { entriesGranted: e.target.value })} required />
              </div>
              {form.tiers.length > 1 && (
                <button type="button" className={styles.secondaryButton} onClick={() => removeTier(index)}>Remove</button>
              )}
            </div>
          ))}
          <div><button type="button" className={styles.secondaryButton} onClick={() => addRow("tiers", { minAmount: "", maxAmount: "", entriesGranted: "1" })}>Add a range</button></div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ld-max">Most entries one customer can hold per draw (optional)</label>
            <input id="ld-max" type="number" min="1" step="1" className={styles.input} value={form.maxEntries} onChange={(e) => set("maxEntries", e.target.value)} placeholder="No limit" />
          </div>
          {hints.map((hint) => (
            <p key={hint} className={styles.notice} role="note">{hint}</p>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Prizes</h2>
          <p className={styles.hint}>Listed in order: the first prize is drawn first. One customer can win only one prize per draw.</p>

          {form.tiers.length >= 2 && (
            <div className={styles.radioGroup}>
              <label className={styles.radioCard}>
                <input type="radio" name="prizeMode" checked={mode === "shared"} onChange={() => setPrizeMode("shared")} />
                <span><strong>Same prizes for everyone</strong><br /><span className={styles.hint}>All bill ranges compete for the same prizes. A bigger bill only earns more entries.</span></span>
              </label>
              <label className={styles.radioCard}>
                <input type="radio" name="prizeMode" checked={mode === "pool_per_tier"} onChange={() => setPrizeMode("pool_per_tier")} />
                <span><strong>A separate prize pool for each bill range</strong><br /><span className={styles.hint}>Each range has its own prizes and its own winners. Choose the range for every prize below.</span></span>
              </label>
              <label className={styles.radioCard}>
                <input type="radio" name="prizeMode" checked={mode === "restricted"} onChange={() => setPrizeMode("restricted")} />
                <span><strong>Some prizes only for certain ranges</strong><br /><span className={styles.hint}>One shared list, but you can reserve a prize for bigger bills. A prize with no range ticked is open to everyone.</span></span>
              </label>
            </div>
          )}

          {form.prizes.map((prize, index) => (
            <div key={index} className={styles.prizeBlock}>
              <div className={styles.prizeRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`ld-p-${index}`}>Prize {index + 1}</label>
                  <input id={`ld-p-${index}`} className={styles.input} value={prize.prizeDescription} onChange={(e) => setRow("prizes", index, { prizeDescription: e.target.value })} placeholder="e.g. 43-inch Smart TV" required maxLength={200} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`ld-pv-${index}`}>Worth (₹, optional)</label>
                  <input id={`ld-pv-${index}`} type="number" min="0" className={styles.input} value={prize.prizeValue} onChange={(e) => setRow("prizes", index, { prizeValue: e.target.value })} />
                </div>
                {form.prizes.length > 1 && (
                  <button type="button" className={styles.secondaryButton} onClick={() => removeRow("prizes", index)}>Remove</button>
                )}
              </div>

              {mode === "pool_per_tier" && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`ld-ps-${index}`}>Won by customers in</label>
                  <select id={`ld-ps-${index}`} className={styles.input} value={prize.rows[0] ?? 0} onChange={(e) => setPrizeRows(index, [Number(e.target.value)])}>
                    {form.tiers.map((tier, i) => <option key={i} value={i}>{rangeLabel(tier, i)}</option>)}
                  </select>
                </div>
              )}

              {mode === "restricted" && (
                <fieldset className={styles.scope}>
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
          ))}
          <div><button type="button" className={styles.secondaryButton} onClick={() => addRow("prizes", { prizeDescription: "", prizeValue: "", rows: mode === "pool_per_tier" ? [0] : [] })}>Add a prize</button></div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>When are winners drawn?</h2>
          <div className={styles.radioGroup}>
            <label className={styles.radioCard}>
              <input type="radio" name="schedule" checked={form.scheduleType === "end_of_campaign"} onChange={() => set("scheduleType", "end_of_campaign")} />
              <span><strong>Once, when entries close</strong><br /><span className={styles.hint}>One draw for everyone who entered.</span></span>
            </label>
            <label className={styles.radioCard}>
              <input type="radio" name="schedule" checked={form.scheduleType === "recurring"} onChange={() => set("scheduleType", "recurring")} />
              <span><strong>On a schedule</strong><br /><span className={styles.hint}>Each draw only uses entries made since the previous draw.</span></span>
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
                <input id="ld-time" type="time" className={styles.input} value={form.time} onChange={(e) => set("time", e.target.value)} required />
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Who runs the draw?</h2>
          <div className={styles.radioGroup}>
            <label className={styles.radioCard}>
              <input type="radio" name="trigger" checked={form.triggerMode === "automatic"} onChange={() => set("triggerMode", "automatic")} />
              <span><strong>Automatic</strong><br /><span className={styles.hint}>The draw runs by itself on its date. You can still run it early or move the date.</span></span>
            </label>
            <label className={styles.radioCard}>
              <input type="radio" name="trigger" checked={form.triggerMode === "manual"} onChange={() => set("triggerMode", "manual")} />
              <span><strong>Manual</strong><br /><span className={styles.hint}>Nothing happens on the date. You press &ldquo;Run Draw&rdquo; when you are ready.</span></span>
            </label>
          </div>
        </section>

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? "Saving…" : "Save as draft"}</button>
          <button type="button" className={styles.secondaryButton} onClick={() => router.push("/lucky-draws")}>Cancel</button>
        </div>
      </form>
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
