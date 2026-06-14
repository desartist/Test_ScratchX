"use client";
import React from "react";
import "./globals.css";
import styles from "./layout.module.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

export default function DashboardLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ colorScheme: 'light' }}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <main className={styles.mainContent}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
