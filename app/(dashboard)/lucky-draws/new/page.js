"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Gift, ImagePlus, Info, Pencil, Plus, QrCode, Radio, Send, Store, X } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import Modal from "@/components/common/Modal";
import FieldError from "@/components/luckyDraw/FieldError";
import { focusFirstError } from "@/components/luckyDraw/focusFirstError";
import { api, istInputToIso, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { blankLevel, blankWizardForm, buildCampaignBody, errorFieldId, stepErrors } from "@/lib/luckyDraw/wizardValidation";
import { storeHasLocation } from "@/lib/luckyDraw/storeRules";
import { formatINR, formatNumber, parseAmount } from "@/lib/luckyDraw/calculator";
import { DRAW_TYPE_DESCRIPTION, DRAW_TYPE_LABEL, PRIZE_LEVEL_LABEL, describeMinBill, formatDayTime, pluralDays } from "@/lib/luckyDraw/display";
import { compressPrizeImage } from "@/lib/luckyDraw/imageCompress";
import styles from "../luckyDraws.module.css";

const STEPS = ["Draw type", "Details & entry", "Prizes", "Review"];
const HEADINGS = [
  ["New lucky draw", "How will this draw run? Choose the way that fits your shop."],
  ["Details and entry", "Name the draw, set its dates and the smallest bill that gets an entry."],
  ["Prizes", "One grand prize, your 2nd prizes and, if you like, 3rd prizes."],
  ["Review and publish", "Check everything once more. The draw type cannot change after publishing."],
];
const DAY_MS = 24 * 60 * 60 * 1000;
const DRAW_OPTIONS = [
  { key: "physical", icon: Store, points: ["Staff type in each customer's entry at the counter", "You hold the draw in your shop", "You pick each winner from the entry list here"] },
  { key: "live_online", icon: Radio, points: ["Customers scan your QR, or staff add them", "ScratchX picks the winners at random", "You reveal them live: 3rd, then 2nd, then Grand"] },
  { key: "digital", icon: QrCode, points: ["Customers scan your QR code with their bill", "You press Run draw when you are ready", "ScratchX picks and texts every winner at once"] },
];
const PLACEHOLDER = { grand: "e.g. 43-inch Smart TV", second: "e.g. Gold coin", third: "e.g. Gift voucher" };
const RANK = { grand: 1, second: 2, third: 3 };

const Req = () => <span className={styles.required} aria-hidden="true">*</span>;

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

function LevelCard({ levelKey, level, errors, onChange, onTidy, onPickImage, imageBusy, onRemove }) {
  const rank = RANK[levelKey];
  const key = (field) => `${levelKey}.${field}`;
  const id = (field) => errorFieldId(key(field));
  const cls = (field) => `${styles.input} ${errors[key(field)] ? styles.inputError : ""}`;
  const quantity = rank === 1 ? 1 : parseAmount(level.quantity);
  const total = parseAmount(level.prizeValue) * quantity;

  return (
    <section className={styles.levelCard} aria-labelledby={id("title")}>
      <div className={styles.levelHead}>
        <h2 className={styles.sectionTitle} id={id("title")}>{PRIZE_LEVEL_LABEL[rank]}</h2>
        <span className={styles.cellSub}>{rank === 1 ? "Required · always 1 winner" : rank === 2 ? "Required" : "Optional"}</span>
        {onRemove && <button type="button" className={styles.ghostButton} onClick={onRemove}><X size={16} aria-hidden="true" />Remove</button>}
      </div>

      <div className={styles.field}>
        <span className={styles.label} id={id("pictureLabel")}>Picture</span>
        <label className={`${styles.imagePick} ${errors[key("imageUrl")] ? styles.inputError : ""}`} aria-labelledby={id("pictureLabel")}>
          {level.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={level.imageUrl} alt={`${level.prizeDescription || PRIZE_LEVEL_LABEL[rank]} picture`} />
          ) : imageBusy ? (
            "Adding…"
          ) : (
            <span style={{ display: "grid", justifyItems: "center", gap: 2 }}><ImagePlus size={20} aria-hidden="true" />Add</span>
          )}
          <input id={id("imageUrl")} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Picture for the ${PRIZE_LEVEL_LABEL[rank].toLowerCase()}`} onChange={(e) => onPickImage(e.target.files?.[0])} />
        </label>
        {level.imageUrl && <button type="button" className={`${styles.ghostButton} ${styles.smallButton}`} onClick={() => onChange("imageUrl", "")}>Remove</button>}
        <FieldError message={errors[key("imageUrl")]} />
      </div>

      <div className={styles.levelFields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id("prizeDescription")}>Prize name<Req /></label>
          <input id={id("prizeDescription")} className={cls("prizeDescription")} value={level.prizeDescription} onChange={(e) => onChange("prizeDescription", e.target.value)} placeholder={PLACEHOLDER[levelKey]} maxLength={200} aria-invalid={!!errors[key("prizeDescription")]} />
          <FieldError message={errors[key("prizeDescription")]} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id("quantity")}>Winners{rank !== 1 && <Req />}</label>
          {rank === 1 ? (
            <input id={id("quantity")} className={styles.input} value="1" disabled />
          ) : (
            <input id={id("quantity")} className={cls("quantity")} inputMode="numeric" value={level.quantity} onChange={(e) => onChange("quantity", e.target.value.replace(/[^\d]/g, ""))} aria-invalid={!!errors[key("quantity")]} />
          )}
          <FieldError message={errors[key("quantity")]} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id("prizeValue")}>{rank === 1 ? "Value" : "Value each"}<Req /></label>
          <div className={styles.moneyInput}>
            <span>₹</span>
            <input id={id("prizeValue")} className={cls("prizeValue")} inputMode="numeric" value={level.prizeValue} onChange={(e) => onChange("prizeValue", e.target.value)} onBlur={() => onTidy("prizeValue")} aria-invalid={!!errors[key("prizeValue")]} />
          </div>
          <FieldError message={errors[key("prizeValue")]} />
        </div>
      </div>
      <p className={styles.levelTotal}>{total ? `${formatNumber(quantity)} × ${formatINR(parseAmount(level.prizeValue))} = ${formatINR(total)}` : ""}</p>
    </section>
  );
}

function NewLuckyDrawForm() {
  const router = useRouter();
  const [form, setForm] = useState(blankWizardForm);
  const [step, setStep] = useState(1);
  const [stores, setStores] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState("");
  const [imageBusy, setImageBusy] = useState(null);
  const [leaving, setLeaving] = useState(false);
  // The form once defaults were filled in; anything different is unsaved work.
  const baseline = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // Default dates are filled in after the first render, so server and client markup match.
    setForm((f) => {
      const now = Date.now();
      const next = {
        ...f,
        startDate: f.startDate || toISTInputValue(new Date(now)),
        endDate: f.endDate || toISTInputValue(new Date(now + 30 * DAY_MS)),
        revealDate: f.revealDate || toISTInputValue(new Date(now + 32 * DAY_MS)),
      };
      baseline.current = next;
      return next;
    });
    api("/api/stores?limit=100&status=active")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.stores || [];
        setStores(list.filter((s) => !s.status || s.status === "active"));
      })
      .catch((err) => {
        if (cancelled) return;
        setStores([]);
        setSubmitError(`We could not load your stores: ${err.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = (key) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearError(key);
  };
  const setLevel = (levelKey, key, value) => {
    setForm((f) => ({ ...f, [levelKey]: { ...f[levelKey], [key]: value } }));
    clearError(`${levelKey}.${key}`);
  };
  // Groups the digits once the owner leaves a value field, without hiding an error that is still true.
  const tidyLevel = (levelKey, key) =>
    setForm((f) => {
      const amount = parseAmount(f[levelKey][key]);
      return amount ? { ...f, [levelKey]: { ...f[levelKey], [key]: formatNumber(amount) } } : f;
    });
  const removeThird = () => {
    setForm((f) => ({ ...f, third: null }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("third."))));
  };

  const showErrors = (found) => {
    setErrors(found);
    window.requestAnimationFrame(() => focusFirstError(found));
  };

  const goTo = (next) => {
    setSubmitError("");
    if (next > step) {
      const found = stepErrors(step, form, { stores: stores || [], now: new Date() });
      if (Object.keys(found).length) {
        showErrors(found);
        return;
      }
    }
    setErrors({});
    setStep(next);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  async function pickImage(levelKey, file) {
    if (!file) return;
    setImageBusy(levelKey);
    clearError(`${levelKey}.imageUrl`);
    try {
      setLevel(levelKey, "imageUrl", await compressPrizeImage(file));
    } catch (err) {
      setErrors((e) => ({ ...e, [`${levelKey}.imageUrl`]: err.message }));
    } finally {
      setImageBusy(null);
    }
  }

  async function save(publish) {
    setSubmitError("");
    if (publish) {
      const found = stepErrors(4, form);
      if (Object.keys(found).length) {
        showErrors(found);
        return;
      }
    }
    setSaving(publish ? "publish" : "draft");
    let created;
    try {
      created = await api("/api/lucky-draws/campaigns", { method: "POST", body: buildCampaignBody(form) });
    } catch (err) {
      setSubmitError(err.message);
      setSaving("");
      window.scrollTo?.({ top: 0, behavior: "smooth" });
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

  const dirty = baseline.current !== null && JSON.stringify(form) !== JSON.stringify(baseline.current);
  const requestLeave = () => (dirty ? setLeaving(true) : router.push("/lucky-draws"));
  const cls = (key) => `${styles.input} ${errors[key] ? styles.inputError : ""}`;

  const storeList = stores || [];
  const storeNames = storeList.map((s) => s.store_name);
  const unlocated = storeList.filter((s) => !storeHasLocation(s)).map((s) => s.store_name);
  const start = istInputToIso(form.startDate);
  const end = istInputToIso(form.endDate);
  const reveal = istInputToIso(form.revealDate);
  const datesOk = start && end && reveal && new Date(end) > new Date(start) && new Date(reveal) >= new Date(end);
  const entryDays = datesOk ? Math.max(1, Math.round((new Date(end) - new Date(start)) / DAY_MS)) : null;
  const gapDays = datesOk ? Math.round((new Date(reveal) - new Date(end)) / DAY_MS) : null;
  const minBillText = form.minBillAmount.trim();
  const minBillValid = /^[\d,]+$/.test(minBillText);

  const levels = [
    { key: "grand", rank: 1, level: form.grand, quantity: 1 },
    { key: "second", rank: 2, level: form.second, quantity: parseAmount(form.second.quantity) },
    ...(form.third ? [{ key: "third", rank: 3, level: form.third, quantity: parseAmount(form.third.quantity) }] : []),
  ];
  const totalValue = levels.reduce((sum, l) => sum + parseAmount(l.level.prizeValue) * l.quantity, 0);
  const totalWinners = levels.reduce((sum, l) => sum + l.quantity, 0);
  const editButton = (n) => (
    <button type="button" className={styles.ghostButton} onClick={() => goTo(n)}><Pencil size={14} aria-hidden="true" />Edit</button>
  );

  return (
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <div className={styles.wizard}>
        <div className={styles.wizardHead}>
          <div>
            <h1 className={styles.title}>{HEADINGS[step - 1][0]}</h1>
            <p className={styles.subtitle}>{HEADINGS[step - 1][1]}</p>
          </div>
          {/* Leaving the wizard is a close action, not "back"; on phones it lives in the footer instead. */}
          <button type="button" className={`${styles.secondaryButton} ${styles.wizardClose}`} onClick={requestLeave}><X size={16} aria-hidden="true" />Cancel</button>
        </div>
        <Steps step={step} />

        {submitError && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{submitError}</p>}

        {step === 1 && (
          <>
            <fieldset id={errorFieldId("drawType")} tabIndex={-1} className={styles.plainFieldset}>
              <legend className={styles.srOnly}>How this draw will run</legend>
              <div className={`${styles.modeGrid} ${errors.drawType ? styles.modeGridError : ""}`}>
                {DRAW_OPTIONS.map(({ key, icon: Icon, points }) => (
                  <label key={key} className={styles.modeCard}>
                    <input type="radio" name="drawType" value={key} checked={form.drawType === key} onChange={() => set("drawType", key)} />
                    <span className={styles.modeIcon}><Icon size={20} aria-hidden="true" /></span>
                    <span className={styles.modeTitle}>{DRAW_TYPE_LABEL[key]}</span>
                    <span className={styles.muted}>{DRAW_TYPE_DESCRIPTION[key]}</span>
                    <ul className={styles.modeList}>
                      {points.map((p) => <li key={p}><Check size={15} aria-hidden="true" />{p}</li>)}
                    </ul>
                  </label>
                ))}
              </div>
              <FieldError message={errors.drawType} />
            </fieldset>
            <p className={styles.info}><Info size={16} aria-hidden="true" /><span>You can&rsquo;t change the draw type after the draw is published.</span></p>
          </>
        )}

        {step === 2 && (
          <>
            <section className={styles.section}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={errorFieldId("name")}>Draw name<Req /></label>
                <input id={errorFieldId("name")} className={cls("name")} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="e.g. Diwali Dhamaka Lucky Draw" aria-invalid={!!errors.name} />
                {errors.name ? <FieldError message={errors.name} /> : <p className={styles.hint}>Customers see this on the entry page and the results.</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ld-description">Description</label>
                <textarea id="ld-description" className={styles.input} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} placeholder="Optionally say what customers can win and why" />
              </div>
            </section>

            <section className={styles.section}>
              <div>
                <h2 className={styles.sectionTitle}>Dates<Req /></h2>
                <p className={styles.hint}>Times are IST. After publishing you can extend dates, but never move them earlier.</p>
              </div>
              <div className={styles.dateGrid}>
                {[
                  ["startDate", 1, "Entries open"],
                  ["endDate", 2, "Entries close"],
                  ["revealDate", 3, "Draw date"],
                ].map(([key, n, label]) => (
                  <div key={key} className={styles.dateCard}>
                    <label className={styles.dateCardHead} htmlFor={errorFieldId(key)}><span className={styles.dateNum}>{n}</span>{label}</label>
                    <input id={errorFieldId(key)} type="datetime-local" className={cls(key)} value={form[key]} onChange={(e) => set(key, e.target.value)} aria-invalid={!!errors[key]} />
                    <FieldError message={errors[key]} />
                  </div>
                ))}
              </div>
              {datesOk && (
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
                    <div><small>{gapDays > 0 ? `${pluralDays(gapDays)} later · draw` : "Draw"}</small><b>{formatDayTime(reveal)}</b></div>
                  </div>
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.field} style={{ maxWidth: 320 }}>
                <label className={styles.label} htmlFor={errorFieldId("minBillAmount")}>Minimum bill amount<Req /></label>
                <div className={styles.moneyInput}>
                  <span>₹</span>
                  <input id={errorFieldId("minBillAmount")} className={cls("minBillAmount")} inputMode="numeric" value={form.minBillAmount} onChange={(e) => set("minBillAmount", e.target.value)} onBlur={() => minBillValid && set("minBillAmount", formatNumber(parseAmount(minBillText)))} placeholder="1,000" aria-invalid={!!errors.minBillAmount} />
                </div>
                {errors.minBillAmount ? (
                  <FieldError message={errors.minBillAmount} />
                ) : (
                  <p className={styles.hint}>{minBillValid ? `${describeMinBill(parseAmount(minBillText))}.` : "Every bill of this amount or more gets 1 entry."}</p>
                )}
              </div>
              <div id={errorFieldId("stores")} tabIndex={-1} className={`${styles.storeBox} ${errors.stores ? styles.inputError : ""}`}>
                <Store size={16} aria-hidden="true" />
                <span>
                  {stores === null ? "Loading your stores…" : storeList.length ? <>Runs at all your active stores ({storeList.length}): <strong>{storeNames.join(", ")}</strong>.</> : "You have no active stores."}
                </span>
              </div>
              <FieldError message={errors.stores} />
              {form.drawType !== "physical" && unlocated.length > 0 && !errors.stores && (
                <p className={styles.notice} role="note">
                  QR entries won&rsquo;t work at {unlocated.join(", ")} until {unlocated.length === 1 ? "it has" : "they have"} a location
                  {form.drawType === "live_online" ? "; staff can still add entries there" : ""}.
                </p>
              )}
            </section>
          </>
        )}

        {step === 3 && (
          <div className={styles.stack}>
            {["grand", "second"].map((levelKey) => (
              <LevelCard key={levelKey} levelKey={levelKey} level={form[levelKey]} errors={errors} onChange={(k, v) => setLevel(levelKey, k, v)} onTidy={(k) => tidyLevel(levelKey, k)} onPickImage={(file) => pickImage(levelKey, file)} imageBusy={imageBusy === levelKey} />
            ))}
            {form.third ? (
              <LevelCard levelKey="third" level={form.third} errors={errors} onChange={(k, v) => setLevel("third", k, v)} onTidy={(k) => tidyLevel("third", k)} onPickImage={(file) => pickImage("third", file)} imageBusy={imageBusy === "third"} onRemove={removeThird} />
            ) : (
              <button type="button" className={styles.addLevel} onClick={() => setForm((f) => ({ ...f, third: blankLevel(true) }))}><Plus size={16} aria-hidden="true" />Add 3rd prize</button>
            )}
            {totalValue > 0 && (
              <div className={styles.alloc}>
                <div className={styles.allocTop}>
                  <span>Total prize cost</span>
                  <b>{formatINR(totalValue)} · {formatNumber(totalWinners)} winner{totalWinners === 1 ? "" : "s"}</b>
                </div>
              </div>
            )}
            {form.drawType === "live_online" && (
              <p className={styles.info}><Radio size={16} aria-hidden="true" /><span>On draw day you reveal the 3rd prize first, then the 2nd, and the grand prize last. A customer can win only once.</span></p>
            )}
          </div>
        )}

        {step === 4 && (
          <>
            <div className={`${styles.panel} ${styles.review}`}>
              <section>
                <h3>Draw type</h3>
                <dl>
                  <div><dd>{DRAW_TYPE_LABEL[form.drawType]}</dd></div>
                  <div><span className={styles.muted}>{DRAW_TYPE_DESCRIPTION[form.drawType]}</span></div>
                </dl>
                {editButton(1)}
              </section>
              <section>
                <h3>Details</h3>
                <dl>
                  <div><dt>Name</dt><dd>{form.name.trim()}</dd></div>
                  {form.description.trim() && <div><dt>Description</dt><dd>{form.description.trim()}</dd></div>}
                  <div><dt>Stores</dt><dd>{storeNames.join(", ") || "—"}</dd></div>
                  <div><dt>Entries</dt><dd>{describeMinBill(parseAmount(form.minBillAmount))}</dd></div>
                </dl>
                {editButton(2)}
              </section>
              <section>
                <h3>Dates</h3>
                <dl>
                  <div><dt>Entries open</dt><dd>{formatDayTime(start)}</dd></div>
                  <div><dt>Entries close</dt><dd>{formatDayTime(end)}</dd></div>
                  <div><dt>Draw date</dt><dd>{formatDayTime(reveal)}</dd></div>
                </dl>
                {editButton(2)}
              </section>
              <section>
                <h3>Prizes</h3>
                <ul className={styles.reviewPrizes}>
                  {levels.map((l) => (
                    <li key={l.key}>
                      {l.level.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.reviewThumb} src={l.level.imageUrl} alt="" />
                      ) : (
                        <span className={styles.reviewThumb}><Gift size={18} aria-hidden="true" /></span>
                      )}
                      <span><strong>{PRIZE_LEVEL_LABEL[l.rank]}</strong> · {l.level.prizeDescription.trim()}</span>
                      <span className={styles.amount}>{formatNumber(l.quantity)} × {formatINR(parseAmount(l.level.prizeValue))}</span>
                    </li>
                  ))}
                  <li>
                    <span />
                    <strong>Total</strong>
                    <span className={styles.amount}>{formatINR(totalValue)} for {formatNumber(totalWinners)} winner{totalWinners === 1 ? "" : "s"}</span>
                  </li>
                </ul>
                {editButton(3)}
              </section>
            </div>
            <div id={errorFieldId("confirmed")} tabIndex={-1} className={`${styles.checkBox} ${errors.confirmed ? styles.inputError : ""}`}>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.confirmed} onChange={(e) => set("confirmed", e.target.checked)} />
                <span>I confirm my store will give these prizes to the winners.</span>
              </label>
            </div>
            <FieldError message={errors.confirmed} />
          </>
        )}

        <div className={styles.wizardFoot}>
          {step === 1 ? (
            <button type="button" className={`${styles.secondaryButton} ${styles.mobileOnly}`} onClick={requestLeave}>Cancel</button>
          ) : (
            <button type="button" className={styles.secondaryButton} onClick={() => goTo(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Back</button>
          )}
          {step < 4 ? (
            <button type="button" className={styles.primaryButton} onClick={() => goTo(step + 1)} disabled={step === 2 && stores === null}>Continue<ArrowRight size={16} aria-hidden="true" /></button>
          ) : (
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} disabled={saving !== ""} onClick={() => save(false)}>{saving === "draft" ? "Saving…" : "Save as draft"}</button>
              <button type="button" className={styles.primaryButton} disabled={saving !== ""} onClick={() => save(true)}>
                <Send size={16} aria-hidden="true" />{saving === "publish" ? "Publishing…" : "Publish lucky draw"}
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={leaving}
        title="Leave without saving?"
        onClose={() => setLeaving(false)}
        footer={
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setLeaving(false)}>Keep editing</button>
            <button type="button" className={styles.dangerButton} onClick={() => router.push("/lucky-draws")}>Leave</button>
          </div>
        }
      >
        <p className={styles.muted} style={{ margin: 0 }}>This lucky draw has not been saved yet, so what you entered will be lost.</p>
      </Modal>
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
