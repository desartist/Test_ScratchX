"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Zap, CheckCircle, ArrowRight } from "lucide-react";
import styles from "./NoSubscriptionCard.module.css";

export default function NoSubscriptionCard() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.decoration}></div>
      <div className={styles.decorationSmall}></div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Zap className={styles.icon} size={48} />
          </div>
          <h1 className={styles.title}>No Active Subscription</h1>
          <p className={styles.subtitle}>
            Unlock the full power of ScratchX to grow your business
          </p>
        </div>

        <div className={styles.featuresSection}>
          <h3 className={styles.featuresTitle}>What You'll Get</h3>
          <div className={styles.featuresGrid}>
            {[
              {
                title: "Unlimited Campaigns",
                description: "Create as many campaigns as you need",
                icon: "🎯",
              },
              {
                title: "Advanced Analytics",
                description: "Real-time insights & performance tracking",
                icon: "📊",
              },
              {
                title: "Multi-Store Support",
                description: "Manage multiple locations seamlessly",
                icon: "🏪",
              },
              {
                title: "Priority Support",
                description: "24/7 dedicated customer support",
                icon: "🎧",
              },
              {
                title: "Custom Branding",
                description: "White-label your scratches",
                icon: "🎨",
              },
              {
                title: "Team Collaboration",
                description: "Invite & manage team members",
                icon: "👥",
              },
            ].map((feature, idx) => (
              <div key={idx} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h4 className={styles.featureTitle}>{feature.title}</h4>
                <p className={styles.featureDescription}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.ctaSection}>
          <button
            onClick={() => router.push("/billing/upgrade")}
            className={styles.primaryButton}
          >
            <span>Upgrade Now</span>
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className={styles.secondaryButton}
          >
            Back to Dashboard
          </button>
        </div>

        <div className={styles.trustSection}>
          <p className={styles.trustText}>
            ✨ Join 1000+ businesses already using ScratchX
          </p>
        </div>
      </div>
    </div>
  );
}
