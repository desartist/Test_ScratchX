"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import {
  PLATFORM_NOTICE_VERSION,
  getPlatformNoticeForRole,
} from "@/lib/platformNoticeContent";
import styles from "./PlatformNoticeModal.module.css";

function PolicyBlock({ block, idx }) {
  if (block.type === "ul") {
    return (
      <ul className={styles.list} key={idx}>
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className={styles.paragraph} key={idx}>
      {block.text}
    </p>
  );
}

export default function PlatformNoticeModal() {
  const { account, refreshAccount } = useAuthContext();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [justAccepted, setJustAccepted] = useState(false);

  const policy = account ? getPlatformNoticeForRole(account.role) : null;
  const alreadyAccepted =
    account?.platformNotice?.accepted &&
    account?.platformNotice?.version === PLATFORM_NOTICE_VERSION;
  const shouldShow = Boolean(policy) && !alreadyAccepted && !justAccepted;

  useEffect(() => {
    if (!shouldShow) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleAccept = async () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/accept-platform-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ version: PLATFORM_NOTICE_VERSION }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record acceptance");
      }
      setJustAccepted(true);
      refreshAccount();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="platform-notice-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 id="platform-notice-title" className={styles.title}>{policy.title}</h2>
            <p className={styles.subtitle}>{policy.subtitle}</p>
          </div>
        </div>

        <div className={styles.body}>
          {policy.sections.map((section, sIdx) => (
            <section className={styles.section} key={sIdx}>
              <h3 className={styles.sectionHeading}>{section.heading}</h3>
              {section.blocks.map((block, bIdx) => (
                <PolicyBlock block={block} idx={bIdx} key={bIdx} />
              ))}
            </section>
          ))}
        </div>

        <div className={styles.footer}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={15} />
              {error}
            </div>
          )}
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className={styles.checkbox}
            />
            <span>{policy.checkboxLabel}</span>
          </label>
          <button
            type="button"
            className={styles.acceptBtn}
            disabled={!checked || submitting}
            onClick={handleAccept}
          >
            {submitting ? "Saving..." : policy.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
