import React from "react";
import Sheet from "@/components/luckyDraw/Sheet";
import styles from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";

/** Yes/no dialog: a centred popup on wider screens, a bottom sheet on phones (see Sheet). */
export default function ConfirmModal({ isOpen, title, children, confirmLabel, busyLabel = "Working…", busy = false, error = "", danger = false, onConfirm, onClose }) {
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Sheet
      isOpen={isOpen}
      title={title}
      onClose={close}
      footer={
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className={danger ? `${styles.dangerButton} ldSheetDanger` : styles.primaryButton} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      }
    >
      {error && <p className={styles.submitError} role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      {children}
    </Sheet>
  );
}
