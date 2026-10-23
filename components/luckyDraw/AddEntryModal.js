"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Sheet from "@/components/luckyDraw/Sheet";
import FieldError from "@/components/luckyDraw/FieldError";
import { focusFirstError } from "@/components/luckyDraw/focusFirstError";
import { api } from "@/lib/luckyDraw/clientApi";
import { describeMinBill } from "@/lib/luckyDraw/display";
import { blankEntryForm, entryBody, entryFieldId, entryFormErrors } from "@/lib/luckyDraw/entryForm";
import styles from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";

const Req = () => <span className={styles.required} aria-hidden="true">*</span>;

/**
 * Staff type in a customer's entry at the counter. Stays open after saving so the next customer can be
 * added straight away. draw: { _id, name, minBillAmount, stores: [{ storeId, storeName }] }.
 */
export default function AddEntryModal({ isOpen, draw, onClose, onSaved }) {
  const stores = draw?.stores || [];
  const defaultStore = stores.length === 1 ? String(stores[0].storeId) : "";
  const [form, setForm] = useState(() => blankEntryForm(defaultStore));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [last, setLast] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(blankEntryForm(defaultStore));
    setErrors({});
    setSubmitError("");
    setLast(null);
  }, [isOpen, defaultStore]);

  if (!draw) return null;
  const needsStore = stores.length > 1;
  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };
  const fieldClass = (key) => `${styles.input} ${errors[key] ? styles.inputError : ""}`;

  async function save(event) {
    event?.preventDefault();
    const found = entryFormErrors(form, { minBillAmount: draw.minBillAmount || 0, needsStore });
    setErrors(found);
    if (Object.keys(found).length) {
      window.requestAnimationFrame(() => focusFirstError(found, entryFieldId));
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const result = await api(`/api/lucky-draws/campaigns/${draw._id}/entries`, { method: "POST", body: entryBody(form) });
      setLast({ ...result, customerName: form.customerName.trim() });
      setForm(blankEntryForm(form.storeId));
      onSaved?.(result);
      document.getElementById(entryFieldId("customerName"))?.focus();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      title={`Add entry · ${draw.name}`}
      onClose={onClose}
      footer={
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          <button type="submit" form="ld-entry-form" className={styles.primaryButton} disabled={saving}>{saving ? "Saving…" : "Save entry"}</button>
        </div>
      }
    >
      <form id="ld-entry-form" className={styles.form} onSubmit={save} noValidate>
        {last && (
          <div className={styles.okBox} role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              Entry <strong className={styles.bigNumber}>#{last.entryNumber}</strong> for {last.customerName}. Write it on the slip.
              {last.confirmationSent ? " SMS sent." : ""}
            </span>
          </div>
        )}
        {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}
        <p className={styles.hint}>{describeMinBill(draw.minBillAmount)}.</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={entryFieldId("customerName")}>Customer name<Req /></label>
          <input id={entryFieldId("customerName")} className={fieldClass("customerName")} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} maxLength={80} autoComplete="off" aria-invalid={!!errors.customerName} />
          <FieldError message={errors.customerName} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={entryFieldId("customerMobile")}>Mobile number<Req /></label>
          <input id={entryFieldId("customerMobile")} className={fieldClass("customerMobile")} inputMode="numeric" maxLength={10} placeholder="10 digits" value={form.customerMobile} onChange={(e) => set("customerMobile", e.target.value.replace(/\D/g, ""))} aria-invalid={!!errors.customerMobile} />
          <FieldError message={errors.customerMobile} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={entryFieldId("billAmount")}>Bill amount<Req /></label>
          <div className={styles.moneyInput}>
            <span>₹</span>
            <input id={entryFieldId("billAmount")} className={fieldClass("billAmount")} inputMode="decimal" value={form.billAmount} onChange={(e) => set("billAmount", e.target.value)} aria-invalid={!!errors.billAmount} />
          </div>
          <FieldError message={errors.billAmount} />
        </div>
        {needsStore && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={entryFieldId("storeId")}>Store<Req /></label>
            <select id={entryFieldId("storeId")} className={fieldClass("storeId")} value={form.storeId} onChange={(e) => set("storeId", e.target.value)} aria-invalid={!!errors.storeId}>
              <option value="">Choose a store</option>
              {stores.map((s) => <option key={String(s.storeId)} value={String(s.storeId)}>{s.storeName}</option>)}
            </select>
            <FieldError message={errors.storeId} />
          </div>
        )}
        <div id={entryFieldId("consent")} tabIndex={-1} className={`${styles.checkBox} ${errors.consent ? styles.inputError : ""}`}>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
            <span>Customer agreed to SMS about this draw.</span>
          </label>
        </div>
        <FieldError message={errors.consent} />
      </form>
    </Sheet>
  );
}
