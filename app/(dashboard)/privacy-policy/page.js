"use client";

import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { getPlatformNoticeForRole } from "@/lib/platformNoticeContent";
import styles from "./privacyPolicy.module.css";

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

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PlatformNoticePage() {
  const { account } = useAuthContext();
  const policy = account ? getPlatformNoticeForRole(account.role) : null;

  if (!account) {
    return <div className={styles.container} />;
  }

  if (!policy) {
    return (
      <div className={styles.container}>
        <div className={styles.notApplicable}>
          This notice does not apply to your account type.
        </div>
      </div>
    );
  }

  const acceptedAt = formatDate(account.platformNotice?.acceptedAt);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className={styles.title}>{policy.title}</h1>
          <p className={styles.subtitle}>{policy.subtitle}</p>
        </div>
      </div>

      {acceptedAt && (
        <div className={styles.acceptedBanner}>
          <CheckCircle2 size={16} />
          You accepted this notice on {acceptedAt}.
        </div>
      )}

      <div className={styles.card}>
        {policy.sections.map((section, sIdx) => (
          <section className={styles.section} key={sIdx}>
            <h2 className={styles.sectionHeading}>{section.heading}</h2>
            {section.blocks.map((block, bIdx) => (
              <PolicyBlock block={block} idx={bIdx} key={bIdx} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
