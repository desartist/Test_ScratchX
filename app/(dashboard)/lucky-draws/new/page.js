"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Award, CalendarDays, Check, Gift, ImagePlus, Info, Medal, Pencil, Plus, QrCode, Radio, Receipt, Send, Store, Trophy, X } from "lucide-react";
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
import { clearWizardDraft, hasProgress, readWizardDraft, writeWizardDraft } from "@/lib/luckyDraw/wizardDraft";
import styles from "../luckyDraws.module.css";

const STEPS = ["Draw type", "Details & entry", "Prizes", "Review"];
const HEADINGS = [
  ["New lucky draw", "How will this draw run? Choose the way that fits your shop."],
  ["Details and entry", "Name the draw, set its dates and the smallest bill that gets an entry."],
  ["Prizes", "One Grand Prize, your Second Prizes and, if you like, Third Prizes."],
  ["Review and publish", "Check everything once more. The draw type cannot change after publishing."],
];
const DAY_MS = 24 * 60 * 60 * 1000;
const DRAW_OPTIONS = [
  { key: "physical", icon: Store, points: ["Staff type in each customer's entry at the counter", "You hold the draw in your shop", "You pick each winner from the entry list here"] },
  { key: "live_online", icon: Radio, points: ["Customers scan your QR, or staff add them", "ScratchX picks the winners at random", "You reveal them live: Third, then Second, then the Grand Prize"] },
  { key: "digital", icon: QrCode, points: ["Customers scan your QR code with their bill", "You press Run draw when you are ready", "ScratchX picks and texts every winner at once"] },
];
const PLACEHOLDER = { grand: "e.g. 43-inch Smart TV", second: "e.g. Gold coin", third: "e.g. Gift voucher" };
const RANK = { grand: 1, second: 2, third: 3 };
const DRAW_ICON = { physical: Store, live_online: Radio, digital: QrCode };
const VALUE_PLACEHOLDER = { grand: "20,000", second: "5,000", third: "2,000" };

/** localStorage, or null where the browser blocks it (private mode, disabled storage). */
function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

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

const LEVEL_ICON = { grand: Trophy, second: Medal, third: Award };

/** One prize level as a form card, in the style of the Scratch reward cards. */
function LevelCard({ levelKey, level, errors, onChange, onTidy, onPickImage, imageBusy, onRemove }) {
  const rank = RANK[levelKey];
  const Icon = LEVEL_ICON[levelKey];
  const fileInput = useRef(null);
  const key = (field) => `${levelKey}.${field}`;
  const id = (field) => errorFieldId(key(field));
  const cls = (field) => `${styles.input} ${errors[key(field)] ? styles.inputError : ""}`;
  const quantity = rank === 1 ? 1 : parseAmount(level.quantity);
  const value = parseAmount(level.prizeValue);
  const label = PRIZE_LEVEL_LABEL[rank];

  return (
    <section className={styles.prizeCard} aria-labelledby={id("title")}>
      <header className={styles.prizeCardHead}>
        <span className={styles.prizeCardIcon}><Icon size={18} aria-hidden="true" /></span>
        <h2 className={styles.prizeCardTitle} id={id("title")}>{label}</h2>
        {rank === 1 && <span className={styles.prizeCardTag}>1 winner</span>}
        {rank === 3 && <span className={styles.prizeCardTag}>Optional</span>}
        {onRemove && (
          <button type="button" className={`${styles.ghostButton} ${styles.prizeCardRemove}`} onClick={onRemove}>
            <X size={16} aria-hidden="true" />Remove
          </button>
        )}
      </header>

      <div className={styles.prizeCardBody}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id("prizeDescription")}>Prize name<Req /></label>
          <input id={id("prizeDescription")} className={cls("prizeDescription")} value={level.prizeDescription} onChange={(e) => onChange("prizeDescription", e.target.value)} placeholder={PLACEHOLDER[levelKey]} maxLength={200} aria-invalid={!!errors[key("prizeDescription")]} />
          <FieldError message={errors[key("prizeDescription")]} />
        </div>

        <div className={rank === 1 ? styles.prizeRowSingle : styles.prizeRowPair}>
          {rank !== 1 && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor={id("quantity")}>Winners<Req /></label>
              <input id={id("quantity")} className={cls("quantity")} inputMode="numeric" value={level.quantity} onChange={(e) => onChange("quantity", e.target.value.replace(/[^\d]/g, ""))} aria-invalid={!!errors[key("quantity")]} />
              <FieldError message={errors[key("quantity")]} />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor={id("prizeValue")}>{rank === 1 ? "Prize value (₹)" : "Value per winner (₹)"}<Req /></label>
            <div className={styles.moneyInput}>
              <span>₹</span>
              <input id={id("prizeValue")} className={cls("prizeValue")} inputMode="numeric" placeholder={VALUE_PLACEHOLDER[levelKey]} value={level.prizeValue} onChange={(e) => onChange("prizeValue", e.target.value)} onBlur={() => onTidy("prizeValue")} aria-invalid={!!errors[key("prizeValue")]} />
            </div>
            <FieldError message={errors[key("prizeValue")]} />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Prize picture <span className={styles.labelHint}>(optional)</span></span>
          <input
            ref={fileInput}
            id={id("imageUrl")}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenFile}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onPickImage(file);
            }}
          />
          {level.imageUrl ? (
            <div className={styles.prizePicture}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={level.imageUrl} alt={`${level.prizeDescription || label} picture`} />
              <button type="button" className={styles.prizePictureRemove} onClick={() => onChange("imageUrl", "")} aria-label="Remove picture"><X size={14} aria-hidden="true" /></button>
            </div>
          ) : (
            <button type="button" className={`${styles.uploadButton} ${errors[key("imageUrl")] ? styles.inputError : ""}`} onClick={() => fileInput.current?.click()} disabled={imageBusy}>
              <ImagePlus size={16} aria-hidden="true" />{imageBusy ? "Adding picture…" : "Upload image"}
            </button>
          )}
          <FieldError message={errors[key("imageUrl")]} />
        </div>

        {value > 0 && quantity > 0 && (
          <p className={styles.prizeCardTotal}>
            {rank === 1 ? `1 winner · ${formatINR(value)}` : `${formatNumber(quantity)} × ${formatINR(value)} = ${formatINR(value * quantity)}`}
          </p>
        )}
      </div>
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
  const [showFullDescription, setShowFullDescription] = useState(false);
  // A draft found on this device, while the owner decides whether to continue it.
  const [resume, setResume] = useState(null);
  // The form once defaults were filled in; anything different is unsaved work.
  const baseline = useRef(null);

  useEffect(() => {
    let cancelled = false;
    // Default dates are filled in after the first render, so server and client markup match.
    const now = Date.now();
    const defaults = {
      ...blankWizardForm(),
      startDate: toISTInputValue(new Date(now)),
      endDate: toISTInputValue(new Date(now + 30 * DAY_MS)),
      revealDate: toISTInputValue(new Date(now + 32 * DAY_MS)),
    };
    baseline.current = defaults;
    setForm(defaults);
    // An unfinished draw saved on this device: offer to continue it.
    const saved = readWizardDraft(browserStorage());
    if (saved) setResume(saved);
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

  // Keep the work on this device as the owner goes, so a refresh or a closed browser loses nothing.
  // Nothing is written while the "continue where you left off?" question is open, so it can't overwrite the draft.
  useEffect(() => {
    if (baseline.current === null || resume || !hasProgress(form)) return undefined;
    const timer = setTimeout(() => writeWizardDraft(browserStorage(), { form, step }), 400);
    return () => clearTimeout(timer);
  }, [form, step, resume]);

  const continueDraft = () => {
    setForm(resume.form);
    setStep(resume.step);
    setErrors({});
    setResume(null);
  };
  const startOver = () => {
    clearWizardDraft(browserStorage());
    setResume(null);
  };

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
    setForm((f) => (f[levelKey] ? { ...f, [levelKey]: { ...f[levelKey], [key]: value } } : f));
    clearError(`${levelKey}.${key}`);
  };
  // Groups the digits once the owner leaves a value field, without hiding an error that is still true.
  const tidyLevel = (levelKey, key) =>
    setForm((f) => {
      if (!f[levelKey]) return f;
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
      clearWizardDraft(browserStorage());
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

  const dirty = hasProgress(form);
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
  const editButton = (n, label = "Edit") => (
    <button type="button" className={`${styles.ghostButton} ${styles.reviewEdit}`} onClick={() => goTo(n)}><Pencil size={14} aria-hidden="true" />{label}</button>
  );
  const description = form.description.trim();
  const DrawIcon = DRAW_ICON[form.drawType] || Store;

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
              <h2 className={styles.sectionTitle}>Dates <span className={styles.labelHint}>(IST)</span><Req /></h2>
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
                <div className={`${styles.timeline} ${styles.wizardTimeline}`} aria-label="Date preview" style={{ paddingTop: 6 }}>
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
              <button type="button" className={styles.addLevel} onClick={() => setForm((f) => ({ ...f, third: blankLevel(true) }))}><Plus size={16} aria-hidden="true" />Add Third Prize</button>
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
              <p className={styles.info}><Radio size={16} aria-hidden="true" /><span>On draw day you reveal the Third Prize first, then the Second Prize, and the Grand Prize last. A customer can win only once.</span></p>
            )}
          </div>
        )}

        {step === 4 && (
          <>
            <section className={styles.reviewHero} aria-labelledby="ld-review-name">
              <div className={styles.reviewHeroTop}>
                <span className={styles.modeTag}><DrawIcon size={15} aria-hidden="true" />{DRAW_TYPE_LABEL[form.drawType]}</span>
                {editButton(1, "Change type")}
              </div>
              <h2 className={styles.reviewName} id="ld-review-name">{form.name.trim()}</h2>
              {description && (
                <div>
                  <p className={`${styles.reviewDesc} ${showFullDescription ? "" : styles.reviewDescClamped}`}>{description}</p>
                  {description.length > 180 && (
                    <button type="button" className={styles.linkButton} onClick={() => setShowFullDescription((v) => !v)}>
                      {showFullDescription ? "Show less" : "Show full description"}
                    </button>
                  )}
                </div>
              )}
              <p className={styles.reviewHeroNote}>{DRAW_TYPE_DESCRIPTION[form.drawType]}</p>
              <dl className={styles.reviewStats}>
                <div><dt>Prize pool</dt><dd>{formatINR(totalValue)}</dd></div>
                <div><dt>Winners</dt><dd>{formatNumber(totalWinners)}</dd></div>
                <div><dt>Min. bill</dt><dd>₹{formatNumber(parseAmount(form.minBillAmount))}</dd></div>
              </dl>
            </section>

            <div className={styles.reviewGrid}>
              <section className={styles.reviewCard}>
                <header className={styles.reviewCardHead}>
                  <span className={styles.reviewCardIcon}><Receipt size={16} aria-hidden="true" /></span>
                  <h3>Entry and stores</h3>
                  {editButton(2)}
                </header>
                <div className={styles.reviewItem}>
                  <span>Who gets an entry</span>
                  <strong>{describeMinBill(parseAmount(form.minBillAmount))}</strong>
                </div>
                <div className={styles.reviewItem}>
                  <span>Stores ({storeNames.length})</span>
                  <div className={styles.reviewChips}>
                    {storeNames.length ? storeNames.map((name) => <span key={name} className={styles.reviewChip}>{name}</span>) : "—"}
                  </div>
                </div>
              </section>

              <section className={styles.reviewCard}>
                <header className={styles.reviewCardHead}>
                  <span className={styles.reviewCardIcon}><CalendarDays size={16} aria-hidden="true" /></span>
                  <h3>Dates</h3>
                  {editButton(2)}
                </header>
                <ol className={styles.reviewDates}>
                  <li><span>Entries open</span><strong>{formatDayTime(start)}</strong></li>
                  <li><span>Entries close</span><strong>{formatDayTime(end)}</strong></li>
                  <li><span>Draw date</span><strong>{formatDayTime(reveal)}</strong></li>
                </ol>
              </section>
            </div>

            <section className={styles.reviewCard}>
              <header className={styles.reviewCardHead}>
                <span className={styles.reviewCardIcon}><Trophy size={16} aria-hidden="true" /></span>
                <h3>Prizes</h3>
                {editButton(3)}
              </header>
              <ul className={styles.reviewPrizeList}>
                {levels.map((l) => {
                  const value = parseAmount(l.level.prizeValue);
                  return (
                    <li key={l.key}>
                      {l.level.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.reviewPrizeThumb} src={l.level.imageUrl} alt="" />
                      ) : (
                        <span className={styles.reviewPrizeThumb}><Gift size={18} aria-hidden="true" /></span>
                      )}
                      <div className={styles.reviewPrizeText}>
                        <span className={styles.reviewPrizeLevel}>{PRIZE_LEVEL_LABEL[l.rank]}</span>
                        <strong>{l.level.prizeDescription.trim()}</strong>
                        <span className={styles.cellSub}>{formatNumber(l.quantity)} winner{l.quantity === 1 ? "" : "s"} × {formatINR(value)}</span>
                      </div>
                      <span className={styles.amount}>{formatINR(value * l.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className={styles.reviewPrizeTotal}>
                <span>Total for {formatNumber(totalWinners)} winner{totalWinners === 1 ? "" : "s"}</span>
                <strong>{formatINR(totalValue)}</strong>
              </div>
            </section>

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
        title="Leave for now?"
        onClose={() => setLeaving(false)}
        footer={
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() => {
                clearWizardDraft(browserStorage());
                router.push("/lucky-draws");
              }}
            >
              Discard draft
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setLeaving(false)}>Keep editing</button>
            <button type="button" className={styles.primaryButton} onClick={() => router.push("/lucky-draws")}>Leave</button>
          </div>
        }
      >
        <p className={styles.muted} style={{ margin: 0 }}>Your progress is kept on this device. Next time you start a new lucky draw you can continue where you left off.</p>
      </Modal>

      <Modal
        isOpen={!!resume}
        title="Continue where you left off?"
        onClose={continueDraft}
        footer={
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={startOver}>Start over</button>
            <button type="button" className={styles.primaryButton} onClick={continueDraft}>Continue</button>
          </div>
        }
      >
        {resume && (
          <p className={styles.muted} style={{ margin: 0 }}>
            You have an unfinished lucky draw{resume.form.name.trim() ? <> <strong>&ldquo;{resume.form.name.trim()}&rdquo;</strong></> : ""}
            {resume.savedAt ? `, saved ${formatDayTime(resume.savedAt)}` : ""}. Continue at step {resume.step}: {STEPS[resume.step - 1]}.
          </p>
        )}
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
