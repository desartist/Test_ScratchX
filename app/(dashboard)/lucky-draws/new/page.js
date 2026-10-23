"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Award, Check, CirclePlus, Gift, ImagePlus, Lock, Medal, QrCode, Radio, Send, Store, Trash2, Trophy, X } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import Sheet from "@/components/luckyDraw/Sheet";
import ConfirmModal from "@/components/luckyDraw/ConfirmModal";
import SelectMenu from "@/components/luckyDraw/SelectMenu";
import FieldError from "@/components/luckyDraw/FieldError";
import { focusFirstError } from "@/components/luckyDraw/focusFirstError";
import { api, istInputToIso, toISTInputValue } from "@/lib/luckyDraw/clientApi";
import { DRAW_TYPES } from "@/lib/luckyDraw/constants";
import { MAX_SMALLER_PRIZES, blankLevel, blankWizardForm, buildCampaignBody, errorFieldId, smallerIndex, smallerKey, stepErrors } from "@/lib/luckyDraw/wizardValidation";
import { storeHasLocation } from "@/lib/luckyDraw/storeRules";
import { formatINR, formatNumber, parseAmount } from "@/lib/luckyDraw/calculator";
import { DRAW_TYPE_LABEL, prizeLevelLabel, formatDay, formatDayTime } from "@/lib/luckyDraw/display";
import { compressPrizeImage } from "@/lib/luckyDraw/imageCompress";
import { clearWizardDraft, hasProgress, readWizardDraft, writeWizardDraft } from "@/lib/luckyDraw/wizardDraft";
import styles from "../luckyDraws.module.css";

const STEPS = ["Details & entry", "Prizes", "Review"];
const DAY_MS = 24 * 60 * 60 * 1000;
const PLACEHOLDER = { 1: "e.g. 43-inch Smart TV", 2: "e.g. Gold coin", 3: "e.g. Gift voucher" };
const DRAW_ICON = { physical: Store, live_online: Radio, digital: QrCode };
const VALUE_PLACEHOLDER = { 1: "20,000", 2: "5,000", 3: "2,000" };

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

const LEVEL_ICON = { 1: Trophy, 2: Medal, 3: Award };

const levelHasInput = (level) => !!(level.prizeDescription.trim() || level.prizeValue.trim() || level.imageUrl);

/** One prize level as a form card, in the style of the Scratch reward cards. */
function LevelCard({ levelKey, rank, level, errors, onChange, onTidy, onPickImage, imageBusy, onRemove, removeDisabled }) {
  const Icon = LEVEL_ICON[rank] || Gift;
  const fileInput = useRef(null);
  const key = (field) => `${levelKey}.${field}`;
  const id = (field) => errorFieldId(key(field));
  const cls = (field) => `${styles.input} ${errors[key(field)] ? styles.inputError : ""}`;
  const quantity = rank === 1 ? 1 : parseAmount(level.quantity);
  const value = parseAmount(level.prizeValue);
  const label = prizeLevelLabel(rank);

  return (
    <section className={styles.prizeCard} aria-labelledby={id("title")}>
      <header className={styles.prizeCardHead}>
        <span className={styles.prizeCardIcon}><Icon size={18} aria-hidden="true" /></span>
        <h2 className={styles.prizeCardTitle} id={id("title")}>{label}</h2>
        {rank === 1 && <span className={styles.prizeCardTag}>1 winner</span>}
        {onRemove && (
          <button type="button" className={styles.prizeCardRemove} onClick={onRemove} disabled={removeDisabled} aria-label={`Remove ${label}`} title="Remove">
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className={styles.prizeCardBody}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={id("prizeDescription")}>Prize name<Req /></label>
          <input id={id("prizeDescription")} className={cls("prizeDescription")} value={level.prizeDescription} onChange={(e) => onChange("prizeDescription", e.target.value)} placeholder={PLACEHOLDER[rank] || "e.g. Gift hamper"} maxLength={200} aria-invalid={!!errors[key("prizeDescription")]} />
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
              <input id={id("prizeValue")} className={cls("prizeValue")} inputMode="numeric" placeholder={VALUE_PLACEHOLDER[rank] || "1,000"} value={level.prizeValue} onChange={(e) => onChange("prizeValue", e.target.value)} onBlur={() => onTidy("prizeValue")} aria-invalid={!!errors[key("prizeValue")]} />
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
  // The smaller prize (index into form.smaller) waiting for "Remove this prize?" to be answered.
  const [removing, setRemoving] = useState(null);
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
  // grand/second/third live on the form itself; smaller prizes ('p4', 'p5', …) in form.smaller.
  const levelOf = (f, levelKey) => {
    const i = smallerIndex(levelKey);
    return i < 0 ? f[levelKey] : f.smaller[i];
  };
  const updateLevel = (f, levelKey, patch) => {
    const level = levelOf(f, levelKey);
    if (!level) return f;
    const i = smallerIndex(levelKey);
    const next = { ...level, ...patch };
    return i < 0 ? { ...f, [levelKey]: next } : { ...f, smaller: f.smaller.map((l, j) => (j === i ? next : l)) };
  };
  const setLevel = (levelKey, key, value) => {
    setForm((f) => updateLevel(f, levelKey, { [key]: value }));
    clearError(`${levelKey}.${key}`);
  };
  // Groups the digits once the owner leaves a value field, without hiding an error that is still true.
  const tidyLevel = (levelKey, key) =>
    setForm((f) => {
      const amount = parseAmount(levelOf(f, levelKey)?.[key]);
      return amount ? updateLevel(f, levelKey, { [key]: formatNumber(amount) }) : f;
    });
  const addSmaller = () => {
    const key = smallerKey(form.smaller.length);
    setForm((f) => (f.smaller.length < MAX_SMALLER_PRIZES ? { ...f, smaller: [...f.smaller, blankLevel(true)] } : f));
    window.requestAnimationFrame(() => document.getElementById(errorFieldId(`${key}.prizeDescription`))?.focus());
  };
  // The prizes after the removed one move up a place, and so do their errors.
  const removeSmaller = (index) => {
    setForm((f) => ({ ...f, smaller: f.smaller.filter((_, i) => i !== index) }));
    setErrors((e) => {
      const next = {};
      for (const [k, message] of Object.entries(e)) {
        const dot = k.indexOf(".");
        const i = dot < 0 ? -1 : smallerIndex(k.slice(0, dot));
        if (i === index) continue;
        next[i > index ? `${smallerKey(i - 1)}${k.slice(dot)}` : k] = message;
      }
      return next;
    });
    setRemoving(null);
  };
  // Guard: a prize with anything filled in is only removed once the owner confirms.
  const requestRemoveSmaller = (index) => (levelHasInput(form.smaller[index]) ? setRemoving(index) : removeSmaller(index));

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
      const found = stepErrors(3, form);
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
  const minBillText = form.minBillAmount.trim();
  const minBillValid = /^[\d,]+$/.test(minBillText);

  const levels = [
    { key: "grand", rank: 1, level: form.grand, quantity: 1 },
    { key: "second", rank: 2, level: form.second, quantity: parseAmount(form.second.quantity) },
    { key: "third", rank: 3, level: form.third, quantity: parseAmount(form.third.quantity) },
    ...form.smaller.map((level, i) => ({ key: smallerKey(i), rank: i + 4, index: i, level, quantity: parseAmount(level.quantity) })),
  ];
  const removingLevel = removing === null ? null : levels.find((l) => l.index === removing);
  const totalValue = levels.reduce((sum, l) => sum + parseAmount(l.level.prizeValue) * l.quantity, 0);
  const totalWinners = levels.reduce((sum, l) => sum + l.quantity, 0);
  const description = form.description.trim();
  const DrawIcon = DRAW_ICON[form.drawType] || Store;

  return (
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <div className={styles.wizard}>
        <div className={styles.wizardHead}>
          {/* One title for every step; the step bar below says where you are. */}
          <h1 className={`${styles.title} ${styles.wizardTitle}`}>New lucky draw</h1>
          {/* Leaving the wizard is a close action, not "back"; on phones it lives in the footer instead. */}
          <button type="button" className={`${styles.secondaryButton} ${styles.wizardClose}`} onClick={requestLeave}><X size={16} aria-hidden="true" />Cancel</button>
        </div>
        <Steps step={step} />

        {submitError && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{submitError}</p>}

        {step === 1 && (
          <div className={styles.flatForm}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={errorFieldId("drawType")}>Draw type<Req /></label>
              <SelectMenu
                id={errorFieldId("drawType")}
                value={form.drawType}
                options={DRAW_TYPES.map((key) => ({ value: key, label: DRAW_TYPE_LABEL[key], icon: DRAW_ICON[key] }))}
                placeholder="Choose a draw type"
                onChange={(key) => set("drawType", key)}
                invalid={!!errors.drawType}
              />
              <FieldError message={errors.drawType} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={errorFieldId("name")}>Draw name<Req /></label>
              <input id={errorFieldId("name")} className={cls("name")} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="e.g. Diwali Dhamaka" aria-invalid={!!errors.name} />
              <FieldError message={errors.name} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="ld-description">Description <span className={styles.labelHint}>(optional)</span></label>
              <textarea id="ld-description" className={styles.input} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} placeholder="What customers can win" />
            </div>

            <fieldset className={styles.fieldGroup}>
              <legend className={styles.label}>Entry period <span className={styles.labelHint}>(IST)</span><Req /></legend>
              <div className={styles.fieldPair}>
                {[
                  ["startDate", "Opens"],
                  ["endDate", "Closes"],
                ].map(([key, label]) => (
                  <div key={key} className={styles.field}>
                    <label className={styles.subLabel} htmlFor={errorFieldId(key)}>{label}</label>
                    <input id={errorFieldId(key)} type="datetime-local" className={cls(key)} value={form[key]} onChange={(e) => set(key, e.target.value)} aria-invalid={!!errors[key]} />
                    <FieldError message={errors[key]} />
                  </div>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={errorFieldId("revealDate")}>Draw date <span className={styles.labelHint}>(IST)</span><Req /></label>
              <input id={errorFieldId("revealDate")} type="datetime-local" className={cls("revealDate")} value={form.revealDate} onChange={(e) => set("revealDate", e.target.value)} aria-invalid={!!errors.revealDate} />
              <FieldError message={errors.revealDate} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={errorFieldId("minBillAmount")}>Minimum bill amount<Req /></label>
              <div className={styles.moneyInput}>
                <span>₹</span>
                <input id={errorFieldId("minBillAmount")} className={cls("minBillAmount")} inputMode="numeric" value={form.minBillAmount} onChange={(e) => set("minBillAmount", e.target.value)} onBlur={() => minBillValid && set("minBillAmount", formatNumber(parseAmount(minBillText)))} placeholder="1,000" aria-invalid={!!errors.minBillAmount} />
              </div>
              <FieldError message={errors.minBillAmount} />
            </div>

            <div className={styles.field}>
              <p id={errorFieldId("stores")} tabIndex={-1} className={`${styles.metaLine} ${errors.stores ? styles.metaLineError : ""}`}>
                <Store size={16} aria-hidden="true" />
                <span>{stores === null ? "Loading your stores…" : storeList.length ? storeNames.join(", ") : "You have no active stores."}</span>
              </p>
              <FieldError message={errors.stores} />
              {form.drawType !== "physical" && unlocated.length > 0 && !errors.stores && (
                <p className={styles.notice} role="note">
                  No location set for {unlocated.join(", ")}, so QR entries won&rsquo;t work there{form.drawType === "live_online" ? " (staff entries will)" : ""}.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stack}>
            {levels.map(({ key: levelKey, rank, level, index }) => (
              <LevelCard
                key={levelKey}
                levelKey={levelKey}
                rank={rank}
                level={level}
                errors={errors}
                onChange={(k, v) => setLevel(levelKey, k, v)}
                onTidy={(k) => tidyLevel(levelKey, k)}
                onPickImage={(file) => pickImage(levelKey, file)}
                imageBusy={imageBusy === levelKey}
                onRemove={index === undefined ? undefined : () => requestRemoveSmaller(index)}
                // Removing renumbers the prizes after it, so wait for a picture that is still being added.
                removeDisabled={imageBusy !== null}
              />
            ))}
            {form.smaller.length < MAX_SMALLER_PRIZES ? (
              <button type="button" className={styles.addLevel} onClick={addSmaller}>
                <CirclePlus size={18} aria-hidden="true" />Add More Prizes
              </button>
            ) : (
              <p className={styles.hint}>A draw can have up to {MAX_SMALLER_PRIZES + 3} prize levels.</p>
            )}
            {totalValue > 0 && (
              <div className={styles.alloc}>
                <div className={styles.allocTop}>
                  <span>Total prize cost</span>
                  <b>{formatINR(totalValue)} · {formatNumber(totalWinners)} winner{totalWinners === 1 ? "" : "s"}</b>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className={styles.reviewPage}>
            {/* Each part has a title with an Edit link above its card. Details: as the Figma "Campaign Details" card. */}
            <section aria-labelledby="ld-review-details">
              <div className={styles.listHead}>
                <h2 className={styles.listTitle} id="ld-review-details">Details</h2>
                <button type="button" className={styles.textLink} onClick={() => goTo(1)}>Edit</button>
              </div>
              <section className={styles.summaryCard} aria-labelledby="ld-review-name">
              <div className={styles.summaryTitle}>
                <h3 className={styles.summaryName} id="ld-review-name">{form.name.trim()}</h3>
                {/* The lock says the type is fixed once published; the full sentence is in the tooltip and for screen readers. */}
                <span className={styles.typeChip} title="Can’t be changed after publishing">
                  <DrawIcon size={14} aria-hidden="true" />{DRAW_TYPE_LABEL[form.drawType]}<Lock size={12} aria-hidden="true" className={styles.typeChipLock} />
                  <span className={styles.srOnly}>, can&rsquo;t be changed after publishing</span>
                </span>
              </div>
              {description && <p className={styles.summaryDesc}>{description}</p>}
              <dl className={styles.factGrid}>
                <div><dt>Entries</dt><dd>{formatDay(start)} – {formatDay(end)}</dd></div>
                <div><dt>Draw</dt><dd>{formatDayTime(reveal).replace(/^\w+, /, "")}</dd></div>
                <div><dt>Stores</dt><dd>{storeNames.length}</dd></div>
                <div><dt>Min. bill</dt><dd>₹{formatNumber(parseAmount(form.minBillAmount))}</dd></div>
              </dl>
            </section>
            <p className={`${styles.metaLine} ${styles.cardNote}`}><Lock size={14} aria-hidden="true" />The draw type can&rsquo;t be changed after publishing.</p>
          </section>

            <section aria-labelledby="ld-review-prizes">
              <div className={styles.listHead}>
                <h2 className={styles.listTitle} id="ld-review-prizes">Prizes</h2>
                <button type="button" className={styles.textLink} onClick={() => goTo(2)}>Edit</button>
              </div>
              {/* Rows as the Figma "Reward Distribution" list: icon or picture, name over level, total on the right. */}
              <ul className={styles.rowList}>
                {levels.map((l) => {
                  const value = parseAmount(l.level.prizeValue);
                  const Icon = LEVEL_ICON[l.rank] || Gift;
                  return (
                    <li key={l.key} className={styles.row}>
                      {l.level.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.rowIcon} src={l.level.imageUrl} alt="" />
                      ) : (
                        <span className={styles.rowIcon}><Icon size={20} aria-hidden="true" /></span>
                      )}
                      <span className={styles.rowMain}>
                        <strong>{l.level.prizeDescription.trim()}</strong>
                        <span>{prizeLevelLabel(l.rank)}</span>
                      </span>
                      <span className={styles.rowSide}>
                        <strong>{formatINR(value * l.quantity)}</strong>
                        <span>{formatNumber(l.quantity)} × {formatINR(value)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className={`${styles.summaryPool} ${styles.poolAfterList}`}>
                <span>Prize pool</span>
                <strong>{formatINR(totalValue)}</strong>
                <span className={styles.summaryPoolSub}>{formatNumber(totalWinners)} winner{totalWinners === 1 ? "" : "s"}</span>
              </div>
            </section>

            <div className={styles.publishCheck}>
              <label id={errorFieldId("confirmed")} tabIndex={-1} className={`${styles.plainCheck} ${errors.confirmed ? styles.plainCheckError : ""}`}>
                <input type="checkbox" checked={form.confirmed} onChange={(e) => set("confirmed", e.target.checked)} aria-invalid={!!errors.confirmed} />
                <span>I&rsquo;ll give these prizes to the winners.</span>
              </label>
              <FieldError message={errors.confirmed} />
            </div>
          </div>
        )}

        <div className={styles.wizardFoot}>
          {step === 1 ? (
            <button type="button" className={`${styles.secondaryButton} ${styles.mobileOnly}`} onClick={requestLeave}>Cancel</button>
          ) : (
            <button type="button" className={styles.secondaryButton} onClick={() => goTo(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Back</button>
          )}
          {step < STEPS.length ? (
            <button type="button" className={styles.primaryButton} onClick={() => goTo(step + 1)} disabled={step === 1 && stores === null}>Continue<ArrowRight size={16} aria-hidden="true" /></button>
          ) : (
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} disabled={saving !== ""} onClick={() => save(false)}>{saving === "draft" ? "Saving…" : "Save as draft"}</button>
              <button type="button" className={styles.primaryButton} disabled={saving !== "" || !form.confirmed} onClick={() => save(true)}>
                <Send size={16} aria-hidden="true" />{saving === "publish" ? "Publishing…" : "Publish lucky draw"}
              </button>
            </div>
          )}
        </div>
      </div>

      <Sheet
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
            {/* Staying is the safe choice, so it's the main action; on a phone sheet it comes first. */}
            <button type="button" className={styles.secondaryButton} onClick={() => router.push("/lucky-draws")}>Leave</button>
            <button type="button" className={styles.primaryButton} onClick={() => setLeaving(false)}>Keep editing</button>
          </div>
        }
      >
        <p className={styles.muted} style={{ margin: 0 }}>Your progress is saved on this device.</p>
      </Sheet>

      <ConfirmModal
        isOpen={!!removingLevel}
        title="Remove this prize?"
        confirmLabel="Remove prize"
        danger
        onConfirm={() => removeSmaller(removing)}
        onClose={() => setRemoving(null)}
      >
        {removingLevel && (
          <p className={styles.muted} style={{ margin: 0 }}>
            <strong>{prizeLevelLabel(removingLevel.rank)}{removingLevel.level.prizeDescription.trim() ? ` (${removingLevel.level.prizeDescription.trim()})` : ""}</strong> will be removed.
            {removingLevel.index < form.smaller.length - 1 ? " Later prizes move up one place." : ""}
          </p>
        )}
      </ConfirmModal>

      <Sheet
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
            {resume.form.name.trim() ? <strong>{resume.form.name.trim()}</strong> : "Unfinished lucky draw"}
            {resume.savedAt ? ` · saved ${formatDayTime(resume.savedAt)}` : ""} · step {resume.step} of {STEPS.length}
          </p>
        )}
      </Sheet>
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
