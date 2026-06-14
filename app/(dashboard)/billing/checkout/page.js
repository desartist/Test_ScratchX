"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./checkout.module.css";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAccount } = useAuthContext();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.error("[Checkout] Failed to load Razorpay script");
      setRazorpayLoaded(false);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        const planId = searchParams.get("planId");
        const planName = searchParams.get("planName");

        if (!planId || !planName) {
          setError("Invalid plan selected");
          setLoading(false);
          return;
        }

        // Fetch all plans and find the matching one
        const res = await fetch("/api/subscription/plans");
        const data = await res.json();

        if (!data.success || !data.data) {
          setError("Could not load plan details");
          setLoading(false);
          return;
        }

        // Find plan by name (case-insensitive)
        const matchedPlan = data.data.find(
          p => p.name?.toLowerCase() === planName.toLowerCase()
        );

        if (!matchedPlan) {
          setError(`Plan "${planName}" not found`);
          setLoading(false);
          return;
        }

        setPlan({
          _id: matchedPlan._id,
          name: matchedPlan.name,
          displayName: matchedPlan.displayName,
          basePrice: matchedPlan.price?.base || 0,
          gstAmount: (matchedPlan.price?.withGST || 0) - (matchedPlan.price?.base || 0),
          totalPrice: matchedPlan.price?.withGST || 0,
        });
        setLoading(false);
      } catch (err) {
        console.error("[Checkout] Error fetching plan:", err);
        setError("Failed to load plan details");
        setLoading(false);
      }
    };

    fetchPlanDetails();
  }, [searchParams]);

  const handleConfirmPurchase = async () => {
    if (!razorpayLoaded) {
      setError("Razorpay payment system is not ready. Please try again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Create Razorpay order
      const orderRes = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planId: plan._id,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        setError(orderData.error || "Failed to create payment order. Please try again.");
        setSubmitting(false);
        return;
      }

      const { orderId, amount, currency, razorpayKeyId, description, planName, merchantEmail } = orderData.data;

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: razorpayKeyId,
        amount: amount, // in paise
        currency: currency,
        name: "ScratchX",
        description: description,
        order_id: orderId,
        prefill: {
          email: merchantEmail,
        },
        theme: {
          color: "#3b82f6",
        },
        handler: async (response) => {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              setError(verifyData.error || "Payment verification failed.");
              setSubmitting(false);
              return;
            }

            // Payment successful — refresh account so sidebar + dashboard reflect new plan
            await refreshAccount();
            setSuccess(true);
            setTimeout(() => {
              router.push("/dashboard");
            }, 2000);
          } catch (err) {
            console.error("[Checkout] Payment verification error:", err);
            setError("Payment verification failed. Please contact support.");
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            console.log("[Checkout] Payment modal dismissed by user");
            setSubmitting(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("[Checkout] Error:", err);
      setError("An error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingBox}>
            <Loader2 size={48} className={styles.spinner} />
            <p>Loading plan details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorBox}>
            <AlertCircle size={32} />
            <p>{error || "Plan not found. Please select a plan from the available options."}</p>
            <button onClick={() => router.push("/billing")} className={styles.backButton}>
              Back to Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {success ? (
          <div className={styles.successBox}>
            <CheckCircle2 size={64} className={styles.successIcon} />
            <h2>Plan Activated!</h2>
            <p>Your {plan.name} plan is now active for lifetime.</p>
            <p className={styles.redirectText}>Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={styles.header}>
              <button onClick={() => router.back()} className={styles.backBtn}>
                <ArrowLeft size={20} /> Back
              </button>
              <h1>Review Your Purchase</h1>
            </div>

            {/* Error Alert */}
            {error && (
              <div className={styles.errorAlert}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Plan Summary */}
            <div className={styles.planCard}>
              <h2 className={styles.planName}>
                ScratchX {plan.name} Plan
              </h2>
              <p className={styles.planDuration}>One-time purchase • Lifetime access</p>
            </div>

            {/* Features */}
            <div className={styles.featuresCard}>
              <h3>What's Included:</h3>
              <ul>
                <li>✓ Unlimited Campaigns</li>
                <li>✓ Unlimited Scratches</li>
                <li>✓ Reward Management</li>
                <li>✓ Customer Database</li>
                <li>✓ Analytics Dashboard</li>
                <li>✓ Custom Branding</li>
                <li>✓ Priority Support</li>
                {plan.name === "Smart" && (
                  <>
                    <li>✓ Multi-Store (Up to 5 Stores)</li>
                    <li>✓ WhatsApp Integration</li>
                    <li>✓ Advanced Analytics</li>
                    <li>✓ Fraud Protection</li>
                  </>
                )}
                {plan.name === "Core" && (
                  <li>Single Store License</li>
                )}
              </ul>
            </div>

            {/* Pricing Breakdown */}
            <div className={styles.pricingCard}>
              <div className={styles.pricingRow}>
                <span>Plan Price:</span>
                <span className={styles.amount}>₹{plan.basePrice.toLocaleString("en-IN")}</span>
              </div>
              <div className={styles.pricingRow}>
                <span>GST (18%):</span>
                <span className={styles.amount}>₹{plan.gstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className={`${styles.pricingRow} ${styles.totalRow}`}>
                <span className={styles.totalLabel}>Total Amount:</span>
                <span className={styles.totalAmount}>₹{plan.totalPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Confirmation */}
            <div className={styles.confirmationText}>
              <p>
                By confirming, you authorize ScratchX to charge ₹{plan.totalPrice.toLocaleString("en-IN")} to your account.
                Your plan will be active for lifetime with no renewal needed.
              </p>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                onClick={() => router.back()}
                className={styles.cancelBtn}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className={styles.confirmBtn}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Confirm & Activate
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
