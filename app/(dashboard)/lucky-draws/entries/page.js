"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import FlagGate from "@/components/luckyDraw/FlagGate";
import AddEntryModal from "@/components/luckyDraw/AddEntryModal";
import PageHead from "@/components/luckyDraw/PageHead";
import { drawIcon } from "@/components/luckyDraw/icons";
import { api } from "@/lib/luckyDraw/clientApi";
import { formatNumber } from "@/lib/luckyDraw/calculator";
import { DRAW_TYPE_LABEL, formatDayTime } from "@/lib/luckyDraw/display";
import styles from "../luckyDraws.module.css";

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
    <div className={`${styles.container} ${styles.containerCentered}`}>
      <div className={styles.column}>
        <PageHead title="Lucky Draw entries" />
        {error && <p className={styles.submitError} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
        {!draws && !error && <p className={styles.loading}>Loading…</p>}
        {draws && draws.length === 0 && (
          <div className={styles.empty}><p>No lucky draw is taking entries right now.</p></div>
        )}
        {draws && draws.length > 0 && (
          <div className={styles.rowList}>
            {draws.map((draw) => {
              const Icon = drawIcon(draw.drawType);
              return (
                <button key={draw._id} type="button" className={`${styles.row} ${styles.rowAction}`} onClick={() => setAdding(draw)}>
                  <span className={styles.rowIcon}><Icon size={20} aria-hidden="true" /></span>
                  <span className={styles.rowMain}>
                    <strong>{draw.name}</strong>
                    <span>{DRAW_TYPE_LABEL[draw.drawType]} · min. bill ₹{formatNumber(draw.minBillAmount)}</span>
                    <span>Closes {formatDayTime(draw.endDate)}</span>
                  </span>
                  <span className={styles.rowSide}>
                    <strong>{formatNumber(draw.entryCount)}</strong>
                    <span>{draw.entryCount === 1 ? "entry" : "entries"}</span>
                    <span className={styles.rowAdd}><Plus size={14} aria-hidden="true" />Add entry</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
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
