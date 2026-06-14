"use client";
import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import styles from "./ActiveSessionsCard.module.css";

export default function ActiveSessionsCard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setError(null);
      const response = await fetch("/api/sessions", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load sessions");
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId) => {
    setTerminating(sessionId);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, action: "logout" }),
      });

      if (response.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        const data = await response.json();
        setError(data.error || "Failed to logout device");
      }
    } catch (err) {
      console.error("Error terminating session:", err);
      setError(err.message);
    } finally {
      setTerminating(null);
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case "desktop":
        return "🖥️";
      case "mobile":
        return "📱";
      case "tablet":
        return "📦";
      default:
        return "💻";
    }
  };

  const formatDate = (date) => {
    if (!date) return "Unknown";
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <h3>Active Sessions</h3>
        <p className={styles.loadingText}>Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <h3>Active Sessions</h3>
        <p className={styles.errorText}>Error: {error}</p>
        <button onClick={loadSessions} className={styles.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className={styles.card}>
        <h3>Active Sessions</h3>
        <p className={styles.subtitle}>
          Manage devices that are currently logged in to your account
        </p>
        <p className={styles.noSessions}>
          No active sessions found. You are logged out everywhere else.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3>Active Sessions</h3>
      <p className={styles.subtitle}>
        Manage devices that are currently logged in to your account
      </p>

      <div className={styles.sessionsList}>
        {sessions.map((session) => (
          <div key={session.id} className={styles.sessionItem}>
            <div className={styles.sessionInfo}>
              <div className={styles.deviceIcon}>
                {getDeviceIcon(session.deviceType)}
              </div>
              <div className={styles.details}>
                <div className={styles.deviceName}>
                  {session.deviceName || "Unknown Device"}
                  {session.isCurrent && (
                    <span className={styles.currentBadge}>Current</span>
                  )}
                </div>
                <div className={styles.meta}>
                  {session.browser && (
                    <span className={styles.metaItem}>
                      {session.browser}
                    </span>
                  )}
                  {session.os && (
                    <span className={styles.metaItem}>
                      {session.os}
                    </span>
                  )}
                  {session.location && (
                    <span className={styles.metaItem}>
                      📍 {session.location}
                    </span>
                  )}
                </div>
                <div className={styles.lastActive}>
                  Last active: {formatDate(session.lastActive)}
                </div>
              </div>
            </div>

            {!session.isCurrent && (
              <button
                className={styles.logoutBtn}
                onClick={() => terminateSession(session.id)}
                disabled={terminating === session.id}
                title="Logout from this device"
              >
                <LogOut size={16} />
                {terminating === session.id ? "Logging out..." : "Logout"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
