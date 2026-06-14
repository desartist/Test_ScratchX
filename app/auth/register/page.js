"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./form.module.css";

const BUSINESS_TYPES = [
  "Grocery & Kirana Stores",
  "Jewellery & Luxury",
  "Electronics & Gadgets",
  "Fashion & Apparel",
  "Bakeries & Sweet Shops",
  "Quick Service (QSR)",
  "Salon & Beauty",
  "Fitness & Gyms",
  "Supermarkets / Hypermarkets",
  "Pharmacy / Medical",
  "Home & Lifestyle",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    yourName: "",
    storeName: "",
    email: "",
    password: "",
    businessType: "",
    countryCode: "+91",
    phoneNumber: "",
    storeAddress: "",
  });
  const [otherBusiness, setOtherBusiness] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.yourName,
          storeName: form.storeName,
          email: form.email,
          password: form.password,
          storeAddress: form.storeAddress,
          businessType:
            form.businessType === "Other"
              ? otherBusiness.trim() || "Other"
              : form.businessType,
          countryCode: form.countryCode,
          phoneNumber: form.phoneNumber,
          storeLocation: form.storeAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/auth/login");
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Logo */}
      <div className={styles.logoWrap}>
        <span className={styles.logoText}>Scratch</span>
        <span className={styles.logoX}>X</span>
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Tell us about your store</h1>
          <p className={styles.subtitle}>
            Set up your store to start creating campaigns.
          </p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form className={styles.form} onSubmit={handleRegister}>
          {/* Row: Name + Store Name */}
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Your Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Full name"
                required
                value={form.yourName}
                onChange={set("yourName")}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Store Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Your store name"
                required
                value={form.storeName}
                onChange={set("storeName")}
              />
            </div>
          </div>

          {/* Business Type */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Business Type</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                required
                value={form.businessType}
                onChange={set("businessType")}
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {form.businessType === "Other" && (
              <input
                type="text"
                className={styles.input}
                placeholder="Describe your business type"
                value={otherBusiness}
                onChange={(e) => setOtherBusiness(e.target.value)}
                style={{ marginTop: 10 }}
              />
            )}
          </div>

          {/* Row: Email + Phone */}
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={set("email")}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Contact Number</label>
              <div className={styles.phoneWrap}>
                <select
                  className={styles.countrySelect}
                  value={form.countryCode}
                  onChange={set("countryCode")}
                >
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+971">+971</option>
                  <option value="+65">+65</option>
                </select>
                <input
                  type="tel"
                  className={styles.phoneInput}
                  placeholder="Phone number"
                  required
                  value={form.phoneNumber}
                  onChange={set("phoneNumber")}
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                placeholder="Create a password"
                required
                value={form.password}
                onChange={set("password")}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Store Address */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Store Address</label>
            <textarea
              className={styles.textarea}
              placeholder="Enter your store address"
              required
              value={form.storeAddress}
              onChange={set("storeAddress")}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                Finish Setup &amp; Continue
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className={styles.loginLink}>
          Already have an account?{" "}
          <Link href="/auth/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
