"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import styles from "./upgrade.module.css";
import { useAuthContext } from "@/components/auth/AuthContext";

// Hardcoded plans - exactly as shown on website
const HARDCODED_PLANS = [
  {
    id: "single-store",
    category: "CORE",
    name: "Single Store",
    description: "Perfect for retailers getting started with rewards.",
    originalPrice: 2999,
    finalPrice: 2099,
    discountPercent: 30,
    isPopular: false,
    type: "one-time",
    features: [
      "Unlimited campaigns",
      "Unlimited scratch cards / month",
      "Customer database",
      "3 team members",
      "Basic analytics & insights",
      "Custom branding",
      "Priority support",
    ],
    unavailableFeatures: ["Multi-store management", "WhatsApp integration"],
  },
  {
    id: "multi-store",
    category: "SMART",
    name: "Multi-Store",
    description: "Built for growing businesses with multiple locations.",
    originalPrice: 4999,
    finalPrice: 2999,
    discountPercent: 40,
    isPopular: true,
    type: "one-time",
    features: [
      "Everything in Core, plus —",
      "Multi-store (1 + 4, ₹199/extra)",
      "3 members per store",
      "Advanced analytics & insights",
      "Smart segmentation",
      "WhatsApp integration",
      "Canva Pro (ScratchX Studio)",
      "Advanced automation",
      "Fraud protection",
      "API access (coming soon)",
    ],
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [plans] = useState(HARDCODED_PLANS);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { account } = useAuthContext();

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleUpgrade = async (plan) => {
    try {
      setProcessingPayment(true);

      if (!account || !account.id) {
        setError("No account information available");
        setLoading(false);
        return;
      }
      // For one-time plans, create payment order
      const response = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "x-user-id": account.id,
          "x-user-role": account.role,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // Include auth cookies
        body: JSON.stringify({
          accountEmail: account.email,
          planName: plan.category,
          amount: plan.finalPrice,
          type: "one-time",
        }),
      });

      const paymentData = await response.json();
      if (!paymentData.success) {
        console.error("Payment error:", paymentData);
        alert(
          paymentData.error || "Failed to create payment. Please try again.",
        );
        setProcessingPayment(false);
        return;
      }

      // Check if Razorpay key is available
      if (!paymentData.data.razorpayKeyId) {
        alert("Payment gateway not configured. Please contact support.");
        setProcessingPayment(false);
        return;
      }

      // Initialize Razorpay
      const options = {
        key: paymentData.data.razorpayKeyId,
        amount: paymentData.data.amount,
        currency: "INR",
        order_id: paymentData.data.orderId,
        handler: async (response) => {
          router.push(
            `/billing/success?paymentId=${paymentData.data.paymentId}&plan=${plan.name}`,
          );
        },
        prefill: {
          email: "customer@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#ef9e1b",
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error("Error processing upgrade:", err);
      alert("Error processing payment");
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Simple, Transparent Pricing</h1>
        <p className={styles.subtitle}>
          Choose the perfect plan to grow your business with ScratchX rewards
        </p>
      </div>

      {/* Plans Grid */}
      <div className={styles.plansGrid}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.isPopular ? styles.popular : ""}`}
          >
            {/* Popular Badge */}
            {plan.isPopular && (
              <div className={styles.popularBadge}>
                <span>MOST POPULAR</span>
              </div>
            )}

            {/* Category Badge */}
            <div className={styles.categoryBadge}>{plan.category}</div>

            {/* Discount Badge */}
            <div className={styles.discountBadge}>
              <span>{plan.discountPercent}% off</span>
            </div>

            {/* Plan Name */}
            <h2 className={styles.planName}>{plan.name}</h2>
            <p className={styles.planDescription}>{plan.description}</p>

            {/* Pricing */}
            <div className={styles.pricing}>
              <div className={styles.priceSection}>
                <span className={styles.originalPrice}>
                  ₹{plan.originalPrice}
                </span>
                <div className={styles.finalPrice}>
                  <span className={styles.currency}>₹</span>
                  <span className={styles.amount}>{plan.finalPrice}</span>
                </div>
                <span className={styles.priceType}>one-time</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              className={`${styles.ctaButton} ${plan.isPopular ? styles.primary : styles.secondary}`}
              onClick={() => handleUpgrade(plan)}
              disabled={processingPayment}
            >
              {processingPayment ? "Processing..." : "Get Started"}
            </button>

            {/* Features */}
            <div className={styles.featuresList}>
              <div className={styles.featuresGroup}>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className={styles.feature}>
                    <Check size={18} className={styles.checkIcon} />
                    <span>{feature}</span>
                  </div>
                ))}

                {/* Unavailable Features */}
                {plan.unavailableFeatures &&
                  plan.unavailableFeatures.map((feature, idx) => (
                    <div
                      key={`unavailable-${idx}`}
                      className={`${styles.feature} ${styles.unavailable}`}
                    >
                      <span className={styles.dash}>–</span>
                      <span>{feature}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className={styles.footerNote}>
        <p>
          💡 All plans include 30 days money-back guarantee. No questions asked.
        </p>
      </div>
    </div>
  );
}
