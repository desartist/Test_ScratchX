"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import styles from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";

/**
 * A dropdown drawn by the page instead of the browser, so its options are full size on every
 * device (a native <select> opens a tiny desktop popup in narrow windows and can't be styled).
 * options: [{ value, label, icon? }]. Keyboard: arrows/Home/End move, Enter/Space pick, Escape closes.
 */
export default function SelectMenu({ id, value, options, placeholder, onChange, invalid = false, describedBy }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const button = useRef(null);
  const list = useRef(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  const show = (index) => {
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  };
  const pick = (index) => {
    onChange(options[index].value);
    setOpen(false);
    button.current?.focus();
  };

  const onButtonKey = (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show(options.findIndex((o) => o.value === value));
    }
  };
  const onListKey = (e) => {
    const last = options.length - 1;
    const moves = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setOpen(false);
      if (e.key === "Escape") button.current?.focus();
    }
  };

  const SelectedIcon = selected?.icon;
  return (
    <div className={styles.select} ref={root}>
      <button
        ref={button}
        id={id}
        type="button"
        className={`${styles.input} ${styles.selectButton} ${invalid ? styles.inputError : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : show(options.findIndex((o) => o.value === value)))}
        onKeyDown={onButtonKey}
      >
        {SelectedIcon && <SelectedIcon size={18} aria-hidden="true" className={styles.selectIcon} />}
        <span className={selected ? "" : styles.selectPlaceholder}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={18} aria-hidden="true" className={`${styles.selectChevron} ${open ? styles.selectChevronOpen : ""}`} />
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={styles.selectMenu}
          aria-labelledby={id}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((option, i) => {
            const Icon = option.icon;
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.selectOption} ${i === active ? styles.selectOptionActive : ""}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
              >
                {Icon && <span className={styles.selectOptionIcon}><Icon size={18} aria-hidden="true" /></span>}
                <span>{option.label}</span>
                {isSelected && <Check size={18} aria-hidden="true" className={styles.selectCheck} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
