"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, AlertCircle, Check } from "lucide-react";
import styles from "./DangerZoneCard.module.css";

export default function DangerZoneCard({ merchant }) {
  const router = useRouter();

  // Logout all devices
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Deactivate account
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [password, setPassword] = useState("");
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ===== LOGOUT FROM ALL DEVICES =====
  const handleLogoutAllDevices = async () => {
    setLogoutLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("Logged out from all devices successfully");
        setShowLogoutModal(false);
        setTimeout(() => router.push("/auth/login"), 1500);
      } else {
        setError("Failed to logout. Please try again.");
      }
    } catch (err) {
      setError("Logout failed: " + err.message);
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
    setError(null);
    setSuccess(null);
  };

  // ===== DEACTIVATE ACCOUNT =====
  const handleDeactivateClick = () => {
    setShowDeactivateModal(true);
    setDeactivateStep(1);
    setPassword("");
    setError(null);
    setSuccess(null);
  };

  const handleConfirmDeactivate = async () => {
    setError(null);

    if (!password?.trim()) {
      setError("Password is required to confirm");
      return;
    }

    setDeactivateLoading(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({
        error: "Invalid response from server"
      }));

      if (!response.ok) {
        throw new Error(data.error || `Failed to deactivate account (${response.status})`);
      }

      setSuccess("Account deactivated successfully. Redirecting...");
      setShowDeactivateModal(false);
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (err) {
      setError(err.message || "An error occurred while deactivating your account");
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleDeactivateCancel = () => {
    setShowDeactivateModal(false);
    setDeactivateStep(1);
    setPassword("");
    setError(null);
    setSuccess(null);
  };

  return (
    <div className={styles.dangerZoneSection}>
      {/* ===== HEADER ===== */}
      <div className={styles.dangerZoneHeader}>
        <div className={styles.dangerZoneTitle}>
          <span className={styles.dangerIcon}>⚠️</span>
          <h3>Danger Zone</h3>
        </div>
        <p className={styles.dangerZoneSubtext}>
          Irreversible actions. Proceed with caution.
        </p>
      </div>

      {/* ===== ACTIONS ===== */}
      <div className={styles.dangerZoneActions}>
        {/* Logout All Devices */}
        <button
          className={styles.dangerAction}
          onClick={() => setShowLogoutModal(true)}
        >
          <div className={styles.actionContent}>
            <span className={styles.actionIcon}>🔓</span>
            <div className={styles.actionText}>
              <p className={styles.actionTitle}>Logout from All Devices</p>
              <p className={styles.actionDescription}>
                Sign out of all active sessions
              </p>
            </div>
          </div>
          <span className={styles.actionArrow}>→</span>
        </button>

        {/* Deactivate Account */}
        <button
          className={styles.dangerAction + " " + styles.critical}
          onClick={handleDeactivateClick}
        >
          <div className={styles.actionContent}>
            <span className={styles.actionIcon}>🗑️</span>
            <div className={styles.actionText}>
              <p className={styles.actionTitle}>Deactivate Account</p>
              <p className={styles.actionDescription}>
                Permanently delete your account and data
              </p>
            </div>
          </div>
          <span className={styles.actionArrow}>→</span>
        </button>
      </div>

      {/* ===== LOGOUT MODAL ===== */}
      {showLogoutModal && (
        <div className={styles.modalOverlay} onClick={handleLogoutCancel}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>✓</div>
                <h4>Success!</h4>
                <p>{success}</p>
              </div>
            ) : (
              <>
                <div className={styles.modalHeader}>
                  <LogOut size={28} />
                  <h4>Logout from All Devices?</h4>
                </div>

                <div className={styles.modalBody}>
                  <p>
                    You will be signed out from all devices where you're currently
                    logged in. You'll need to sign in again on any device you want
                    to use.
                  </p>
                </div>

                {error && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className={styles.buttonGroup}>
                  <button
                    className={styles.cancelBtn}
                    onClick={handleLogoutCancel}
                    disabled={logoutLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={handleLogoutAllDevices}
                    disabled={logoutLoading}
                  >
                    {logoutLoading ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== DEACTIVATE MODAL ===== */}
      {showDeactivateModal && (
        <div className={styles.modalOverlay} onClick={handleDeactivateCancel}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>✓</div>
                <h4>Account Deactivated</h4>
                <p>{success}</p>
              </div>
            ) : deactivateStep === 1 ? (
              <>
                <div className={styles.modalHeader}>
                  <Trash2 size={28} className={styles.criticalIcon} />
                  <h4>Deactivate Your Account?</h4>
                </div>

                <div className={styles.stepIndicator}>
                  <span className={styles.stepDot + " " + styles.active}>1</span>
                  <span className={styles.stepLine}></span>
                  <span className={styles.stepDot}>2</span>
                </div>

                <div className={styles.modalBody}>
                  <p>
                    Your account will be deactivated and you won't be able to access
                    it immediately.
                  </p>
                  <div className={styles.infoBox}>
                    <strong>Your data is safe.</strong> We won't delete any of your
                    information. You can reactivate your account anytime by logging
                    in again.
                  </div>
                  <p className={styles.emailText}>
                    Account: <strong>{merchant?.email}</strong>
                  </p>
                </div>

                {error && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className={styles.buttonGroup}>
                  <button
                    className={styles.cancelBtn}
                    onClick={handleDeactivateCancel}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.actionBtn + " " + styles.critical}
                    onClick={() => setDeactivateStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.modalHeader}>
                  <Trash2 size={28} className={styles.criticalIcon} />
                  <h4>Confirm Deactivation</h4>
                </div>

                <div className={styles.stepIndicator}>
                  <span className={styles.stepDot}>1</span>
                  <span className={styles.stepLine}></span>
                  <span className={styles.stepDot + " " + styles.active}>2</span>
                </div>

                <div className={styles.modalBody}>
                  <p>
                    Enter your password to confirm you want to deactivate your
                    account.
                  </p>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    disabled={deactivateLoading}
                    autoFocus
                  />
                </div>

                {error && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className={styles.buttonGroup}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setDeactivateStep(1)}
                    disabled={deactivateLoading}
                  >
                    Back
                  </button>
                  <button
                    className={styles.actionBtn + " " + styles.critical}
                    onClick={handleConfirmDeactivate}
                    disabled={deactivateLoading}
                  >
                    {deactivateLoading ? "Deactivating..." : "Deactivate Account"}
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
