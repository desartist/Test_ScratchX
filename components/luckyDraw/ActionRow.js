import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import styles from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";

/**
 * One tappable row in a .rowList (the review step's list style): icon tile, label, optional data line,
 * chevron. Renders a Link (href), an external link (href + external) or a button (onClick).
 */
export default function ActionRow({ icon: Icon, label, sub = null, side = null, onClick, href, external = false, disabled = false, tone = "" }) {
  const inner = (
    <>
      <span className={`${styles.rowIcon} ${tone}`}><Icon size={20} aria-hidden="true" /></span>
      <span className={styles.rowMain}>
        <strong>{label}</strong>
        {sub && <span>{sub}</span>}
      </span>
      {side || <ChevronRight size={18} aria-hidden="true" className={styles.rowChevron} />}
    </>
  );
  const className = `${styles.row} ${styles.rowAction}`;
  if (href && external) return <a className={className} href={href} target="_blank" rel="noreferrer">{inner}</a>;
  if (href) return <Link className={className} href={href}>{inner}</Link>;
  return <button type="button" className={className} onClick={onClick} disabled={disabled}>{inner}</button>;
}
