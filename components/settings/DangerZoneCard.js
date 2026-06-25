"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import styles from "./DangerZoneCard.module.css";

export default function DangerZoneCard({ merchant }) {
  const router = useRouter();
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/auth/login");
    } catch (err) {
      alert("Logout failed: " + err.message);
    }
  };

  const handleDeactivateClick = () => {
    setShowDeactivateModal(true);
    setDeactivateStep(1);
    setPassword("");
    setError(null);
  };

  const handleConfirmDeactivate = async () => {
    setError(null);

    if (!password?.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({ error: "Invalid response from server" }));

      if (!response.ok) {
        throw new Error(data.error || `Failed to deactivate account (${response.status})`);
      }

      // Success — wait a moment then redirect
      setShowDeactivateModal(false);
      setTimeout(() => router.push("/auth/login"), 500);
    } catch (err) {
      setError(err.message || "An error occurred while deactivating your account");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowDeactivateModal(false);
    setDeactivateStep(1);
    setPassword("");
    setError(null);
  };

  return (
    <div className={styles.dangerZone}>
      <div className={styles.header}>
        <AlertCircle size={24} />
        <h3>Danger Zone</h3>
      </div>

      <div className={styles.actions}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Logout From All Devices
        </button>

        <button
          className={styles.deleteBtn}
          onClick={handleDeactivateClick}
        >
          Deactivate Account
        </button>
      </div>

      {showDeactivateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            {deactivateStep === 1 ? (
              <>
                <h4>Deactivate Account?</h4>
                <p>
                  Your account will be deactivated and you won't be able to access it.
                  <strong> Your data is safe and will not be deleted.</strong> You can
                  reactivate your account anytime by logging in again.
                </p>
                <p style={{ color: "#c62828", fontSize: "14px", marginTop: "12px" }}>
                  Email: {merchant?.email}
                </p>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.cancelBtn}
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeactivateStep(2)}
                  >
                    Continue to Deactivate
                  </button>
                </div>
              </>
            ) : (
              <>
                <h4>Confirm Account Deactivation</h4>
                <p>
                  Enter your password to confirm you want to deactivate your account.
                </p>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  disabled={loading}
                />

                <div className={styles.buttonGroup}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setDeactivateStep(1)}
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={handleConfirmDeactivate}
                    disabled={loading}
                  >
                    {loading ? "Deactivating..." : "Deactivate Account"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
