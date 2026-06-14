"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./CampaignActionsMenu.module.css";

export default function CampaignActionsMenu({
  onEdit,
  onPause,
  onStats,
  onClone,
  onDelete,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle menu item click
  const handleMenuClick = (callback) => {
    callback();
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.menuButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Campaign actions"
        aria-label="Campaign actions menu"
      >
        ⋮
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <button
            className={styles.menuItem}
            onClick={() => handleMenuClick(onEdit)}
          >
            Edit
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleMenuClick(onPause)}
          >
            Pause
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleMenuClick(onStats)}
          >
            Stats
          </button>
          <button
            className={styles.menuItem}
            onClick={() => handleMenuClick(onClone)}
          >
            Clone
          </button>
          <button
            className={`${styles.menuItem} ${styles.dangerous}`}
            onClick={() => handleMenuClick(onDelete)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
