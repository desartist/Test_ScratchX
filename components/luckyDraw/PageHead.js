import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "@/app/(dashboard)/lucky-draws/luckyDraws.module.css";

/**
 * The head of every Lucky Draw screen, laid out like the create wizard's: back on the left, the title
 * centred, an optional action on the right (hidden on phones when desktopOnly, where it moves to the
 * pinned action bar). children render as a centred row under the title (status pills, type chip).
 */
export default function PageHead({ title, back = null, aside = null, asideDesktopOnly = true, children }) {
  return (
    <>
      <div className={styles.pageHead}>
        {back && (
          <Link href={back.href} className={styles.pageBack} aria-label={back.label} title={back.label}>
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
        )}
        <h1 className={styles.title}>{title}</h1>
        {aside && <div className={`${styles.pageAside} ${asideDesktopOnly ? styles.desktopOnly : ""}`}>{aside}</div>}
      </div>
      {children && <div className={styles.pageMeta}>{children}</div>}
    </>
  );
}
