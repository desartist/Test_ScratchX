"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Radio, Store } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import AddEntryModal from "@/components/luckyDraw/AddEntryModal";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatNumber } from "@/lib/luckyDraw/calculator";
import { DRAW_TYPE_LABEL, describeMinBill, formatDayTime } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

const DRAW_ICON = { physical: Store, live_online: Radio };

function StaffEntries() {
  const [draws, setDraws] = useState(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(null);

  const load = useCallback(() => {
    api("/api/lucky-draws/staff/draws")
      .then((data) => {
        setDraws(data);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lucky Draw entries</h1>
          <p className={styles.subtitle}>Add a customer&rsquo;s entry when they pay, then give them the entry number to write on their slip.</p>
        </div>
      </div>
      {error && <p className={styles.submitError} role="alert">{error}</p>}
      {!draws && !error && <p className={styles.muted}>Loading…</p>}
      {draws && draws.length === 0 && (
        <div className={styles.empty}><p>No lucky draw is taking entries at your store right now.</p></div>
      )}
      {draws && draws.length > 0 && (
        <div className={styles.staffGrid}>
          {draws.map((draw) => {
            const Icon = DRAW_ICON[draw.drawType] || Store;
            return (
              <section key={draw._id} className={styles.section}>
                <div>
                  <h2 className={styles.sectionTitle}>{draw.name}</h2>
                  <span className={styles.modeTag}><Icon size={15} aria-hidden="true" />{DRAW_TYPE_LABEL[draw.drawType]}</span>
                </div>
                <p className={styles.muted} style={{ margin: 0 }}>{describeMinBill(draw.minBillAmount)} · Entries close {formatDayTime(draw.endDate)}</p>
                <p style={{ margin: 0 }}>
                  <strong>{formatNumber(draw.entryCount)}</strong> {draw.entryCount === 1 ? "entry" : "entries"} so far
                  {draw.stores.length === 1 ? ` at ${draw.stores[0].storeName}` : ""}
                </p>
                <div><button type="button" className={styles.primaryButton} onClick={() => setAdding(draw)}><Plus size={16} aria-hidden="true" />Add entry</button></div>
              </section>
            );
          })}
        </div>
      )}
      <AddEntryModal
        isOpen={!!adding}
        draw={adding}
        onClose={() => {
          setAdding(null);
          load();
        }}
      />
    </div>
  );
}

export default function StaffEntriesPage() {
  return (
    <FlagGate>
      <StaffEntries />
    </FlagGate>
  );
}
