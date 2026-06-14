// components/dashboard/SearchBar.js
"use client";
import React from "react";
import { Search } from "lucide-react";
import styles from "./SearchBar.module.css";

export default function SearchBar({
  value = "",
  onChange = () => {},
  placeholder = "Search campaigns...",
}) {
  return (
    <div className={styles.container}>
      <Search className={styles.icon} size={20} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );
}
