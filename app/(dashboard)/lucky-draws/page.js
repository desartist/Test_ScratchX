"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Calculator, Plus, Ticket } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import ActionRow from "@/components/luckyDraw/ActionRow";
import PageHead from "@/components/luckyDraw/PageHead";
import { drawIcon } from "@/components/luckyDraw/icons";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeTotals } from "@/lib/luckyDraw/prizeCategories";
import { DRAW_TYPE_LABEL, drawStage, formatDayTime, listGroup, nextStep } from "@/lib/luckyDraw/display";
import { WIZARD_STEP_COUNT, readWizardDraft } from "@/lib/luckyDraw/wizardDraft";
import styles from "./luckyDraws.module.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "done", label: "Completed" },
];

const entriesLabel = (c) => `${formatNumber(c.entryCount || 0)} ${c.entryCount === 1 ? "entry" : "entries"}`;

function FirstTime() {
  return (
    <div className={styles.empty}>
      {/* The empty-state illustration from the ScratchX design, as on Analytics and the plan screens. */}
      <Image className={styles.emptyIllustration} src="/ScratchXCampaign.svg" alt="" width={320} height={280} priority />
      <h2 className={styles.emptyTitle}>Run your first lucky draw</h2>
      {/* As in the Figma empty states: one full-width main action. */}
      <div className={styles.emptyActions}>
        <Link href="/lucky-draws/new" className={`${styles.primaryButton} ${styles.emptyCta}`}>New lucky draw</Link>
      </div>
    </div>
  );
}

function savedDraft() {
  try {
    return readWizardDraft(window.localStorage);
  } catch {
    return null;
  }
}

function LuckyDrawList() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");
  const [notOwner, setNotOwner] = useState(false);
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(null);
  // An unfinished "New lucky draw" kept on this device (see lib/luckyDraw/wizardDraft.js).
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api("/api/lucky-draws/campaigns")
      .then((data) => {
        if (cancelled) return;
        setNow(new Date());
        setCampaigns(data);
        setDraft(savedDraft());
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 403) setNotOwner(true);
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () =>
      (campaigns || []).map((c) => {
        const stage = drawStage(c, { now: now || new Date() });
        return { campaign: c, stage, group: listGroup(stage), pool: prizeTotals(c.prizeTiers || []).totalValue };
      }),
    [campaigns, now],
  );
  const counts = FILTERS.reduce((acc, f) => ({ ...acc, [f.key]: f.key === "all" ? rows.length : rows.filter((r) => r.group === f.key).length }), {});
  const shown = filter === "all" ? rows : rows.filter((r) => r.group === filter);

  // Staff land here from old links: send them to what they can do at the counter.
  if (notOwner) {
    return (
      <div className={`${styles.container} ${styles.containerCentered}`}>
        <div className={styles.column}>
          <PageHead title="Lucky draws" />
          <div className={styles.rowList}>
            <ActionRow icon={Plus} label="Add entries" href="/lucky-draws/entries" />
            <ActionRow icon={Ticket} label="Redeem a prize" href="/lucky-draws/redeem" />
          </div>
        </div>
      </div>
    );
  }

  const hasDraws = campaigns?.length > 0;

  return (
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <div className={styles.column}>
        <PageHead
          title="Lucky draws"
          aside={hasDraws && <Link href="/lucky-draws/new" className={styles.primaryButton}><Plus size={16} aria-hidden="true" />New lucky draw</Link>}
        >
          <Link href="/lucky-draws/calculator" className={styles.textLink}><Calculator size={15} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }} />Prize calculator</Link>
        </PageHead>

        {draft && (
          <div className={styles.draftBanner} role="status">
            <span>
              <strong>Unfinished lucky draw{draft.form.name.trim() ? `: ${draft.form.name.trim()}` : ""}</strong>
              <span className={styles.cellSub}>Saved {formatDayTime(draft.savedAt)} · step {draft.step} of {WIZARD_STEP_COUNT}</span>
            </span>
            <Link href="/lucky-draws/new" className={styles.primaryButton}>Continue</Link>
          </div>
        )}
        {error && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
        {!campaigns && !error && <p className={styles.loading}>Loading…</p>}
        {campaigns && campaigns.length === 0 && <FirstTime />}

        {hasDraws && (
          <>
            <div className={`${styles.seg} ${styles.segFull}`} role="tablist" aria-label="Filter lucky draws">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={`${styles.segButton} ${filter === f.key ? styles.segOn : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span className={styles.segCount}>{counts[f.key]}</span>
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <p className={styles.muted} style={{ textAlign: "center" }}>No lucky draws here.</p>
            ) : (
              <div className={styles.rowList}>
                {shown.map(({ campaign, stage, pool }) => {
                  const Icon = drawIcon(campaign.drawType);
                  return (
                    <Link key={campaign._id} href={`/lucky-draws/${campaign._id}`} className={`${styles.row} ${styles.rowAction}`}>
                      <span className={styles.rowIcon}><Icon size={20} aria-hidden="true" /></span>
                      <span className={styles.rowMain}>
                        <strong>{campaign.name}</strong>
                        <span className={styles.rowMeta}>
                          <span className={`${styles.pill} ${styles[`pill_${stage.tone}`]}`}>{stage.label}</span>
                          {DRAW_TYPE_LABEL[campaign.drawType] || "Lucky draw"}
                        </span>
                        <span className={styles.rowNext}>{nextStep(campaign, stage, now || undefined)}</span>
                      </span>
                      <span className={styles.rowSide}>
                        <strong>{pool ? formatINR(pool) : "—"}</strong>
                        <span>{entriesLabel(campaign)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className={`${styles.wizardFoot} ${styles.phoneFoot}`}>
              <Link href="/lucky-draws/new" className={styles.primaryButton}><Plus size={16} aria-hidden="true" />New lucky draw</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LuckyDrawsPage() {
  return (
    <FlagGate>
      <LuckyDrawList />
    </FlagGate>
  );
}
