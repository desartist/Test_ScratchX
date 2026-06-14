"use client";
import React from "react";
import styles from "../register/form.module.css";

export default function LoginAndRegisterLayout({ children }) {
  return (
    <div className={styles.layout}>
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
