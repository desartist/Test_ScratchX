"use client";
import React from "react";
import styles from "./ParticipationTimeline.module.css";

export default function ParticipationTimeline({ participation }) {
  const timelineSteps = [
    {
      key: "qr_scanned",
      label: "QR Scanned",
      timestamp: participation.createdAt,
      completed: true,
      icon: "📱",
    },
    {
      key: "location_verified",
      label: "Location Verified",
      timestamp: participation.createdAt,
      completed: participation.status !== "initiated",
      icon: "📍",
    },
    {
      key: "participation_created",
      label: "Participation Created",
      timestamp: participation.createdAt,
      completed: participation.status !== "initiated",
      icon: "✅",
    },
    {
      key: "coupon_selected",
      label: "Coupon Selected",
      timestamp: participation.createdAt,
      completed:
        participation.status !== "initiated" &&
        participation.status !== "verified",
      icon: "🎫",
    },
    {
      key: "scratch_completed",
      label: "Scratch Completed",
      timestamp: participation.revealed_at,
      completed:
        participation.status === "revealed" ||
        participation.status === "redeemed" ||
        participation.status === "expired",
      icon: "🎁",
    },
    {
      key: "reward_won",
      label: "Reward Won",
      timestamp: participation.revealed_at,
      completed:
        participation.status === "revealed" ||
        participation.status === "redeemed" ||
        participation.status === "expired",
      icon: "🏆",
    },
    {
      key: "reward_claimed",
      label: "Reward Claimed",
      timestamp: participation.redeemed_at,
      completed: participation.status === "redeemed",
      icon: "💳",
    },
  ];

  return (
    <div className={styles.timeline}>
      <h3 className={styles.title}>Participation Journey</h3>
      <div className={styles.steps}>
        {timelineSteps.map((step, index) => (
          <div
            key={step.key}
            className={`${styles.step} ${step.completed ? styles.completed : styles.pending}`}
          >
            <div className={styles.stepIcon}>{step.icon}</div>
            <div className={styles.stepContent}>
              <div className={styles.stepLabel}>{step.label}</div>
              {step.timestamp && (
                <div className={styles.stepTime}>
                  {new Date(step.timestamp).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
            {index < timelineSteps.length - 1 && (
              <div className={styles.connector}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
