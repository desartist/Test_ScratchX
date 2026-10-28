"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import styles from "./Sheet.module.css";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The lucky draw dialogs: a centred popup on wider screens and, on phones, a bottom sheet in the
 * ScratchX Figma style (rounded top, no dividers, the main action full width with Cancel below it).
 * Same props as components/common/Modal: { isOpen, title, onClose, footer, children }.
 * Escape and the backdrop close it, Tab stays inside, and focus returns to where it was on close.
 */
export default function Sheet({ isOpen, title, onClose, footer, children, focusField = true }) {
  const panel = useRef(null);
  const titleId = useId();
  // The latest onClose, for the key handler set up once per opening.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const items = () => [...(panel.current?.querySelectorAll(FOCUSABLE) || [])];
    // Start on the first form field; with none, on the dialog itself, so Enter never fires an action
    // (like "Start over" or "Remove prize") the owner hasn't chosen yet.
    // focusField false: open on the dialog itself, for sheets whose first field is optional (no keyboard pop-up).
    const field = focusField ? panel.current?.querySelector("[data-sheet-body] :is(input, select, textarea):not([disabled])") : null;
    (field || panel.current)?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const [head, tail] = [list[0], list[list.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [isOpen, focusField]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <span className={styles.grabber} aria-hidden="true" />
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body} data-sheet-body>{children}</div>
        {footer && <div className={styles.foot}>{footer}</div>}
      </div>
    </div>
  );
}
