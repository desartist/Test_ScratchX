"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Gift, Plus, QrCode, Radio, Store, Ticket, Trophy } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeTotals } from "@/lib/luckyDraw/prizeCategories";
import { DRAW_TYPE_LABEL, drawStage, formatDayTime, listGroup, nextStep } from "@/lib/luckyDraw/display";
import { readWizardDraft } from "@/lib/luckyDraw/wizardDraft";
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
      <span className={styles.emptyArt}><Gift size={38} aria-hidden="true" /></span>
      <h2 className={styles.sectionTitle}>Run your first lucky draw</h2>
      <p className={styles.muted}>
        Customers enter when they shop with you: by QR code, at the counter, or both. On the draw date the winners are picked and you hand over the prizes at your store.
      </p>
      <ol className={styles.howSteps}>
        <li><b><span className={styles.howNum}>1</span>Choose how it runs</b><span className={styles.muted}>Physical, live online or digital.</span></li>
        <li><b><span className={styles.howNum}>2</span>Set dates and the minimum bill</b><span className={styles.muted}>Every bill of at least that amount gets 1 entry.</span></li>
        <li><b><span className={styles.howNum}>3</span>Set the prizes</b><span className={styles.muted}>A Grand Prize, Second Prizes and, if you like, Third Prizes.</span></li>
      </ol>
      <div className={styles.actions}>
        <Link href="/lucky-draws/calculator" className={styles.secondaryButton}>Prize calculator</Link>
        <Link href="/lucky-draws/new" className={styles.primaryButton}><Plus size={16} aria-hidden="true" />New lucky draw</Link>
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
          <p className={styles.subtitle}>Only the store owner can create and manage lucky draws.</p>
        </div>
        <div className={styles.empty}>
          <p>If you work at the counter, you can add customers&rsquo; entries or redeem a winner&rsquo;s claim code.</p>
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lucky draws</h1>
          <p className={styles.subtitle}>Run prize draws for customers who shop at your stores. Plan the cost first, then set the dates and prizes.</p>
        </div>
        {/* With no draws yet the empty state below carries these buttons, so they aren't shown twice. */}
        {campaigns?.length > 0 && (
          <div className={styles.actions}>
            <Link href="/lucky-draws/calculator" className={styles.secondaryButton}>Prize calculator</Link>
            <Link href="/lucky-draws/new" className={styles.primaryButton}><Plus size={16} aria-hidden="true" />New lucky draw</Link>
          </div>
        )}
      </div>

      {draft && (
        <div className={styles.draftBanner} role="status">
          <span>
            <strong>Unfinished lucky draw{draft.form.name.trim() ? `: ${draft.form.name.trim()}` : ""}</strong>
            <span className={styles.cellSub}>Saved {formatDayTime(draft.savedAt)} · step {draft.step} of 4</span>
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
