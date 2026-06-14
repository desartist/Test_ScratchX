"use client";
import React, { useState } from "react";
import { Lock } from "lucide-react";
import styles from "./SettingsSecurityCard.module.css";

export default function SettingsSecurityCard() {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setError(null);
  };

  const validatePassword = () => {
    if (!passwords.current?.trim()) {
      setError("Current password is required");
      return false;
    }
    if (!passwords.new?.trim()) {
      setError("New password is required");
      return false;
    }
    if (passwords.new.length < 8) {
      setError("New password must be at least 8 characters");
      return false;
    }
    if (passwords.new !== passwords.confirm) {
      setError("Passwords do not match");
      return false;
    }
    if (passwords.current === passwords.new) {
      setError("New password must be different from current password");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess(true);
      setPasswords({ current: "", new: "", confirm: "" });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Lock size={20} /> <h3>Change Password</h3>
      </div>

      {success && (
        <div className={styles.successMessage}>
          ✓ Password updated successfully
        </div>
      )}
      {error && <div className={styles.errorMessage}>✗ {error}</div>}

      <input
        type="password"
        placeholder="Current Password"
        name="current"
        value={passwords.current}
        onChange={handleChange}
        className={styles.input}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="New Password"
        name="new"
        value={passwords.new}
        onChange={handleChange}
        className={styles.input}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Confirm Password"
        name="confirm"
        value={passwords.confirm}
        onChange={handleChange}
        className={styles.input}
        disabled={loading}
      />
      <button
        onClick={handleSubmit}
        className={styles.btn}
        disabled={loading}
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </div>
  );
}
