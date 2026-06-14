"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import styles from "./DangerZoneCard.module.css";

export default function DangerZoneCard({ merchant }) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
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

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setDeleteStep(1);
    setPassword("");
    setError(null);
  };

  const handleConfirmDelete = async () => {
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      setShowDeleteModal(false);
      router.push("/auth/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
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
          onClick={handleDeleteClick}
        >
          Delete Account
        </button>
      </div>

      {showDeleteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            {deleteStep === 1 ? (
              <>
                <h4>Delete Account?</h4>
                <p>
                  This action cannot be undone. All your campaigns, data, and
                  account information will be permanently deleted.
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
                    onClick={() => setDeleteStep(2)}
                  >
                    Continue to Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <h4>Confirm Account Deletion</h4>
                <p>
                  Enter your password to confirm you want to delete your account.
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
                    onClick={() => setDeleteStep(1)}
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={handleConfirmDelete}
                    disabled={loading}
                  >
                    {loading ? "Deleting..." : "Delete Account"}
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
