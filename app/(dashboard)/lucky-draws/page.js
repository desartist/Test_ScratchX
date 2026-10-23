"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, QrCode, Radio, Store, Ticket, Trophy } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeTotals } from "@/lib/luckyDraw/prizeCategories";
import { DRAW_TYPE_LABEL, drawStage, formatDayTime, listGroup, nextStep } from "@/lib/luckyDraw/display";
import { WIZARD_STEP_COUNT, readWizardDraft } from "@/lib/luckyDraw/wizardDraft";
import styles from "./luckyDraws.module.css";

const DRAW_ICON = { physical: Store, live_online: Radio, digital: QrCode };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "done", label: "Completed" },
];

function DrawTypeTag({ type }) {
  const Icon = DRAW_ICON[type] || Trophy;
  return (
    <span className={styles.modeTag}>
      <Icon size={15} aria-hidden="true" />
      {DRAW_TYPE_LABEL[type] || "Lucky draw"}
    </span>
  );
}

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
  const router = useRouter();
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

  if (notOwner) {
    return (
      <div className={styles.container}>
        <div>
          <h1 className={styles.title}>Lucky draws</h1>
          <p className={styles.subtitle}>Only the store owner can manage lucky draws.</p>
        </div>
        <div className={styles.empty}>
          <p>At the counter you can add entries or redeem a claim code.</p>
          <div className={styles.actions}>
            <Link href="/lucky-draws/entries" className={styles.primaryButton}><Plus size={16} aria-hidden="true" />Add entries</Link>
            <Link href="/lucky-draws/redeem" className={styles.secondaryButton}><Ticket size={16} aria-hidden="true" />Redeem a prize</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.listHeader}>
        <h1 className={styles.title}>Lucky draws</h1>
        <Link href="/lucky-draws/calculator" className={styles.textLink}>Prize calculator</Link>
        {/* With no draws yet the empty state carries the main action, so it isn't shown twice. */}
        {campaigns?.length > 0 && (
          <Link href="/lucky-draws/new" className={`${styles.primaryButton} ${styles.listHeaderCta}`}><Plus size={16} aria-hidden="true" />New lucky draw</Link>
        )}
      </div>

      {draft && (
        <div className={styles.draftBanner} role="status">
          <span>
            <strong>Unfinished lucky draw{draft.form.name.trim() ? `: ${draft.form.name.trim()}` : ""}</strong>
            <span className={styles.cellSub}>Saved {formatDayTime(draft.savedAt)} · step {draft.step} of {WIZARD_STEP_COUNT}</span>
          </span>
          <Link href="/lucky-draws/new" className={styles.primaryButton}>Continue</Link>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!campaigns && !error && <p className={styles.muted}>Loading…</p>}
      {campaigns && campaigns.length === 0 && <FirstTime />}

      {campaigns && campaigns.length > 0 && (
        <div className={styles.panel}>
          <div className={styles.tabs} role="tablist" aria-label="Filter lucky draws">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={`${styles.tab} ${filter === f.key ? styles.tabOn : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} <span className={styles.tabCount}>{counts[f.key]}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 && <p className={styles.muted} style={{ padding: "20px 22px" }}>No lucky draws here.</p>}

          {shown.length > 0 && (
            <div className={`${styles.tableWrap} ${styles.listTable}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lucky draw</th><th>Draw type</th><th>Status</th><th className={styles.num}>Entries</th><th className={styles.num}>Prize pool</th><th>Next</th><th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ campaign, stage, pool }) => {
                    const href = `/lucky-draws/${campaign._id}`;
                    return (
                      <tr key={campaign._id} className={styles.rowLink} onClick={() => router.push(href)}>
                        <td>
                          <Link href={href} className={styles.cellTitle} onClick={(e) => e.stopPropagation()}>{campaign.name}</Link>
                          <span className={styles.cellSub}>{(campaign.assignedStores || []).map((s) => s.storeName).join(", ")}</span>
                        </td>
                        <td><DrawTypeTag type={campaign.drawType} /></td>
                        <td><span className={`${styles.pill} ${styles[`pill_${stage.tone}`]}`}>{stage.label}</span></td>
                        <td className={styles.num}>{entriesLabel(campaign)}</td>
                        <td className={styles.num}>{pool ? formatINR(pool) : "—"}</td>
                        <td><strong>{nextStep(campaign, stage, now || undefined)}</strong></td>
                        <td><ChevronRight size={18} aria-hidden="true" color="#637080" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.listCards}>
            {shown.map(({ campaign, stage, pool }) => (
              <Link key={campaign._id} href={`/lucky-draws/${campaign._id}`} className={styles.listCard}>
                <span className={styles.listCardMain}>
                  <span className={styles.cellTitle}>{campaign.name}</span>
                  <span className={styles.listCardMeta}>
                    <span className={`${styles.pill} ${styles[`pill_${stage.tone}`]}`}>{stage.label}</span>
                    <DrawTypeTag type={campaign.drawType} />
                  </span>
                  <span className={styles.listCardNext}>{nextStep(campaign, stage, now || undefined)}</span>
                </span>
                <span className={styles.listCardSide}>
                  <span className={styles.amount}>{pool ? formatINR(pool) : "—"}</span>
                  <span className={styles.cellSub}>{entriesLabel(campaign)}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" color="#637080" />
              </Link>
            ))}
          </div>
        </div>
      )}
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
