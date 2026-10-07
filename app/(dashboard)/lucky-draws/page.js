"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, ChevronRight, ClipboardList, Gift, Globe, Plus, Radio, Ticket } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatINR, formatNumber } from "@/lib/luckyDraw/calculator";
import { prizeTotals } from "@/lib/luckyDraw/prizeCategories";
import { MODE_LABEL, drawStage, listGroup, nextStep } from "@/lib/luckyDraw/display";
import styles from "./luckyDraws.module.css";

const MODE_ICON = { online: Globe, manual_online_reveal: Radio, manual_offline_reveal: ClipboardList };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "done", label: "Completed" },
];

function ModeTag({ mode }) {
  const Icon = MODE_ICON[mode] || Globe;
  return (
    <span className={styles.modeTag}>
      <Icon size={15} aria-hidden="true" />
      {MODE_LABEL[mode] || MODE_LABEL.online}
    </span>
  );
}

const entriesLabel = (c) =>
  c.distributionMode && c.distributionMode !== "online"
    ? `${formatNumber(c.slipCount || 0)} slips`
    : `${formatNumber(c.entryCount || 0)} entries`;

function FirstTime() {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyArt}><Gift size={38} aria-hidden="true" /></span>
      <h2 className={styles.sectionTitle}>Run your first lucky draw</h2>
      <p className={styles.muted}>
        Customers enter when they shop with you. On the reveal date, winners are picked at random and you hand over the prizes at your store.
      </p>
      <ol className={styles.howSteps}>
        <li><b><span className={styles.howNum}>1</span>Check the cost</b><span className={styles.muted}>Use the prize calculator to see what the prizes add up to before you commit.</span></li>
        <li><b><span className={styles.howNum}>2</span>Pick dates</b><span className={styles.muted}>Set when entries open, when they close, and when you reveal the winners.</span></li>
        <li><b><span className={styles.howNum}>3</span>Set prizes</b><span className={styles.muted}>Add each prize with a picture, its value and how many winners get it.</span></li>
      </ol>
      <div className={styles.actions}>
        <Link href="/lucky-draws/calculator" className={styles.secondaryButton}><Calculator size={16} aria-hidden="true" />Check the cost first</Link>
        <Link href="/lucky-draws/new" className={styles.primaryButton}><Plus size={16} aria-hidden="true" />New lucky draw</Link>
      </div>
    </div>
  );
}

function LuckyDrawList() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");
  const [notOwner, setNotOwner] = useState(false);
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api("/api/lucky-draws/campaigns")
      .then((data) => {
        if (cancelled) return;
        setNow(new Date());
        setCampaigns(data);
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
          <p>If you hand out prizes at a store, you can redeem a winner&rsquo;s claim code here.</p>
          <Link href="/lucky-draws/redeem" className={styles.primaryButton}>Redeem a prize</Link>
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
        <div className={styles.actions}>
          <Link href="/lucky-draws/redeem" className={styles.ghostButton}><Ticket size={16} aria-hidden="true" />Redeem a prize</Link>
          <Link href="/lucky-draws/calculator" className={styles.secondaryButton}><Calculator size={16} aria-hidden="true" />Prize calculator</Link>
          <Link href="/lucky-draws/new" className={styles.primaryButton}><Plus size={16} aria-hidden="true" />New lucky draw</Link>
        </div>
      </div>

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
                    <th>Lucky draw</th><th>Mode</th><th>Status</th><th className={styles.num}>Entries</th><th className={styles.num}>Prize pool</th><th>Next</th><th aria-label="Open" />
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
                        <td><ModeTag mode={campaign.distributionMode} /></td>
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
                <span className={styles.cellTitle}>{campaign.name}</span>
                <ChevronRight size={18} aria-hidden="true" color="#637080" />
                <span><span className={`${styles.pill} ${styles[`pill_${stage.tone}`]}`}>{stage.label}</span></span>
                <span className={styles.amount}>{pool ? formatINR(pool) : "—"}</span>
                <ModeTag mode={campaign.distributionMode} />
                <span className={styles.muted}>{entriesLabel(campaign)}</span>
                <strong style={{ gridColumn: "1 / -1" }}>{nextStep(campaign, stage, now || undefined)}</strong>
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
