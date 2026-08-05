"use client";

import React from "react";
import { Users, UserPlus } from "lucide-react";
import styles from "./TeamEmptyState.module.css";

export default function TeamEmptyState({ storeName, onAddClick }) {
  return (
    <div className={styles.premiumPage}>
      <div className={styles.premiumCard}>
        <div className={styles.premiumIllustrationPane}>
          <div className={styles.premiumDots} />
          <div className={styles.premiumIconCircle}>
            <Users size={96} strokeWidth={1.4} />
          </div>
        </div>

        <div className={styles.premiumContentPane}>
          <h1 className={styles.premiumHeading}>
            Build Your<br />
            <span className={styles.premiumAccent}>Store Team</span>
          </h1>

          <p className={styles.premiumDescription}>
            Add Store Managers and Store Staff 
            {/* {storeName ? <strong>{storeName}</strong> : "this store"} — give them
            their own login to view campaigns and redeem customer rewards. */}
          </p>

          <div className={styles.premiumNotice}>
            <svg className={styles.premiumNoticeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className={styles.premiumNoticeText}>
              <strong>No team members yet.</strong>{" "}
              Add your first one to get started.
            </p>
          </div>

          <div className={styles.premiumActions}>
            <button type="button" className={styles.premiumPrimaryBtn} onClick={onAddClick}>
              <UserPlus size={18} />
              Add Your First Team Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
