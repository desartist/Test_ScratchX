"use client";
import React from "react";
import styles from "./CampaignFilter.module.css";

export default function CampaignFilter({ activeFilter, onFilterChange }) {
  const filters = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "low-scratches", label: "Low Scratches" },
    { id: "ending-soon", label: "Ending Soon" },
    { id: "ended", label: "Ended" },
    { id: "draft", label: "Draft" },
  ];

  return (
    <div className={styles.filterContainer}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          className={`${styles.filterTab} ${
            activeFilter === filter.id ? styles.active : ""
          }`}
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
