"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, AlertTriangle, Check, ChevronDown, Copy, Crown, ExternalLink, Lock, Play, Radio, Smartphone } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import ActionRow from "@/components/luckyDraw/ActionRow";
import PageHead from "@/components/luckyDraw/PageHead";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { formatDayTime } from "@/lib/luckyDraw/display";
import styles from "../../luckyDraws.module.css";

/** The reveal's next step: in the head on wider screens, pinned to the bottom on phones. */
function PrimaryButton({ icon: Icon, label, disabled, onClick }) {
  return <button type="button" className={styles.primaryButton} disabled={disabled} onClick={onClick}><Icon size={16} aria-hidden="true" />{label}</button>;
}

function LiveReveal() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [frameKey, setFrameKey] = useState(0);
  // The phone preview is a second copy of the reveal page; on a phone the owner opens the real one instead.
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, v] = await Promise.all([api(`/api/lucky-draws/campaigns/${id}`), api(`/api/customer/lucky-draw/campaigns/${id}/reveal`)]);
      setDetail(d);
      setView(v);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, [load]);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const update = () => setShowPreview(wide.matches);
    update();
    wide.addEventListener("change", update);
    return () => wide.removeEventListener("change", update);
  }, []);

  async function act(label, path) {
    setBusy(label);
    setError("");
    try {
      await api(path, { method: "POST" });
      await load();
      setFrameKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  const back = { href: `/lucky-draws/${id}`, label: "Back to the draw" };

  if (!detail || !view) {
    return (
      <div className={`${styles.container} ${styles.containerCentered}`}>
        <div className={styles.column}>
          <PageHead title="Live reveal" back={back} />
          {error ? <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p> : <p className={styles.loading}>Loading…</p>}
        </div>
      </div>
    );
  }

  const { campaign, openDraw, pastDraws } = detail;
  const draw = pastDraws[0];
  const isLive = campaign.drawType === "live_online";
  const entryCount = openDraw?.entryCount ?? 0;
  const started = view.status !== "not_started";
  const done = view.status === "done";
  const entriesOpen = new Date(campaign.endDate) > new Date();
  const link = `${origin}/lucky-draw/${id}/reveal`;
  const nextCategory = started && !done ? view.categories[view.revealedCount] : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy did not work. Select the link and copy it.");
    }
  };

  // The next step of the reveal, pinned at the bottom like the wizard's Continue.
  let primary = null;
  if (isLive && !started && openDraw) {
    primary = {
      label: busy === "start" ? "Picking winners…" : "Start live reveal",
      icon: Play,
      disabled: busy !== "" || entriesOpen || entryCount === 0,
      onClick: () => act("start", `/api/lucky-draws/draws/${openDraw._id}/reveal/start`),
    };
  } else if (isLive && nextCategory && draw) {
    primary = {
      label: busy === "next" ? "Revealing…" : `Reveal ${nextCategory.level.toLowerCase()}`,
      icon: Radio,
      disabled: busy !== "",
      onClick: () => act("next", `/api/lucky-draws/draws/${draw._id}/reveal/next`),
    };
  }

  return (
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <div className={styles.column}>
        <PageHead title="Live reveal" back={back} aside={primary && <PrimaryButton {...primary} />}>
          <span className={`${styles.pill} ${styles[done ? "pill_done" : started ? "pill_live" : "pill_scheduled"]}`}>{done ? "Finished" : started ? "Live" : "Not started"}</span>
          <span className={styles.listCount}>
            {formatDayTime(view.revealDate)}
            {draw ? ` · ${formatNumber(draw.entryCount)} entries` : openDraw ? ` · ${formatNumber(entryCount)} ${entryCount === 1 ? "entry" : "entries"}` : ""}
          </span>
        </PageHead>

        {error && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
        {!isLive && !started && <p className={styles.notice}><AlertTriangle size={16} aria-hidden="true" /><span>This draw isn&rsquo;t revealed live. See winners on the draw page.</span></p>}
        {isLive && !started && entriesOpen && <p className={styles.notice}><AlertTriangle size={16} aria-hidden="true" /><span>Start after entries close, {formatDayTime(campaign.endDate)}.</span></p>}
        {isLive && !started && !entriesOpen && entryCount === 0 && <p className={styles.notice}><AlertTriangle size={16} aria-hidden="true" /><span>Nobody entered, so there are no winners to reveal.</span></p>}
        {done && <p className={styles.okBox}><Check size={16} aria-hidden="true" />All prizes revealed. Winners get their claim codes by SMS and email.</p>}

        <section aria-labelledby="ld-live-prizes">
          <div className={styles.listHead}>
            <h2 className={styles.listTitle} id="ld-live-prizes">Prizes</h2>
            <span className={styles.listCount}>{view.revealedCount} of {view.totalCategories} revealed</span>
          </div>
          <ol className={styles.rowList}>
            {view.categories.map((cat, i) => {
              const isNext = started && !done && i === view.revealedCount;
              const isLast = i === view.categories.length - 1;
              const Icon = cat.revealed ? Check : isNext ? Radio : isLast ? Crown : Lock;
              const tone = cat.revealed ? styles.rowIconGreen : isNext ? "" : styles.rowIconMuted;
              return (
                <li key={cat.rank} className={styles.row} aria-current={isNext ? "step" : undefined}>
                  <span className={`${styles.rowIcon} ${tone}`}><Icon size={20} aria-hidden="true" /></span>
                  <span className={styles.rowMain}>
                    <strong>{cat.level}</strong>
                    <span>{cat.name} · {cat.quantity} × {formatINR(cat.value)}</span>
                  </span>
                  <span className={styles.rowSide}>
                    <span>{cat.revealed ? `${cat.winners.length} winner${cat.winners.length === 1 ? "" : "s"}` : isNext ? "Up next" : "Hidden"}</span>
                  </span>
                  {cat.revealed && cat.winners.length > 0 && (
                    <span className={styles.rowFoot}>
                      <span className={styles.winnerChips}>{cat.winners.map((w, j) => <span key={j} className={styles.winnerChip}>{w.label}</span>)}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="ld-live-share">
          <div className={styles.listHead}><h2 className={styles.listTitle} id="ld-live-share">Watch page</h2></div>
          <div className={styles.rowList}>
            <ActionRow icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy watch link"} onClick={copy} tone={copied ? styles.rowIconGreen : styles.rowIconNavy} />
            <ActionRow icon={ExternalLink} label="Open reveal page" href={`/lucky-draw/${id}/reveal`} external tone={styles.rowIconNavy} />
          </div>
        </section>

        <details className={styles.disclosure}>
          <summary><Lock size={15} aria-hidden="true" />How winners are picked<ChevronDown size={16} className={styles.disclosureChevron} aria-hidden="true" /></summary>
          <p>ScratchX picks them at random once, when you start, from every entry (QR and staff). One entry per qualifying bill; one win per customer. Customers on the watch page see each prize as you reveal it.</p>
        </details>

        {showPreview && (
          <section className={styles.previewCol} aria-label="What customers see">
            <span className={styles.modeTag}><Smartphone size={16} aria-hidden="true" />What customers see</span>
            <div className={styles.phoneFrame}>
              <iframe key={frameKey} className={styles.phoneScreen} title="Customer reveal page preview" src={`/lucky-draw/${id}/reveal`} loading="lazy" />
            </div>
          </section>
        )}

        {primary && <div className={`${styles.wizardFoot} ${styles.phoneFoot}`}><PrimaryButton {...primary} /></div>}
      </div>
    </div>
  );
}

export default function LiveRevealPage() {
  return (
    <FlagGate>
      <LiveReveal />
    </FlagGate>
  );
}
