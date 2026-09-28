"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import styles from "./Snackbar.module.css";

/**
 * Small confirmation message pinned to the top of the screen, which hides
 * itself after `duration` ms.
 *
 * Controlled — the parent owns the message and clears it in `onClose`:
 *
 *   const [snack, setSnack] = useState(null);
 *   setSnack("Campaign deleted successfully");
 *   <Snackbar message={snack} onClose={() => setSnack(null)} />
 *
 * A new message (even the same text again) restarts the timer, because the
 * parent re-sets state. Rendered in a portal so no parent's overflow or
 * stacking context can clip it.
 */
export default function Snackbar({ message, onClose, variant = "success", duration = 3000 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  // A message is only ever set after a user action, so the first render —
  // server and client alike — is always empty: no hydration mismatch, and
  // `document` exists by the time there's anything to portal.
  if (!message || typeof document === "undefined") return null;

  const Icon = variant === "error" ? AlertCircle : CheckCircle2;

  return createPortal(
    <div className={styles.wrap}>
      <div
        className={`${styles.snackbar} ${styles[variant] || ""}`}
        // Errors interrupt; confirmations wait their turn.
        role={variant === "error" ? "alert" : "status"}
        aria-live={variant === "error" ? "assertive" : "polite"}
      >
        <Icon size={18} className={styles.icon} aria-hidden="true" />
        <span className={styles.message}>{message}</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

Snackbar.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func,
  variant: PropTypes.oneOf(["success", "error"]),
  duration: PropTypes.number,
};
