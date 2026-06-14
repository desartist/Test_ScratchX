// components/dashboard/FilterTabs.js
"use client";
import React from "react";
import styles from "./FilterTabs.module.css";

const TAB_OPTIONS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "low-scratches", label: "Low Scratches" },
  { id: "ending-soon", label: "Ending Soon" },
  { id: "ended", label: "Ended" },
  { id: "draft", label: "Draft" },
];

export default function FilterTabs({
  activeTab = "all",
  onTabChange = () => {},
  lowScratchCount = 0,
}) {
  return (
    <div className={styles.tabsContainer}>
      {TAB_OPTIONS.map((tab) => {
        const showCount = tab.id === "low-scratches" && lowScratchCount > 0;
        return (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {showCount && (
              <span className={styles.countBadge}>{lowScratchCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
