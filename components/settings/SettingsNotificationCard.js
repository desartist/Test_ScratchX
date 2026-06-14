"use client";
import React, { useState, useEffect } from "react";
import styles from "./SettingsNotificationCard.module.css";

export default function SettingsNotificationCard() {
  const [notifications, setNotifications] = useState({
    campaigns: true,
    stores: true,
    customers: false,
    subscription: true,
    marketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/settings/notifications", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.data || notifications);
        }
      } catch (err) {
        console.error("Error loading notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const toggle = async (key) => {
    const newState = !notifications[key];
    setNotifications({ ...notifications, [key]: newState });
    setSaving(true);

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...notifications,
          [key]: newState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notification preference");
      }
    } catch (err) {
      console.error("Error saving notification:", err);
      setNotifications({ ...notifications, [key]: !newState });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <h3>Notification Preferences</h3>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3>Notification Preferences</h3>
      {Object.entries(notifications).map(([key, value]) => (
        <div key={key} className={styles.toggleRow}>
          <div>
            <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            {saving && <span className={styles.savingIndicator}>Saving...</span>}
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={value}
              onChange={() => toggle(key)}
              disabled={saving}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      ))}
    </div>
  );
}
