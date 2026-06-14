"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./form.module.css";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [yourName, setYourName] = useState("Abhishek Pratap");
  const [storeName, setStoreName] = useState("ProCodrr");
  const [email, setEmail] = useState("procodrr@gmail.com");
  const [password, setPassword] = useState("123456");
  const [storeAddress, setStoreAddress] = useState("123 Main St");
  const [businessType, setBusinessType] = useState("Retail");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("9876543210");
  const [storeLocation, setStoreLocation] = useState("123 Main St");

  const handleRegister = async (e) => {
    e.preventDefault();
    // API registration logic here
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: yourName,
        storeName,
        email,
        password,
        storeAddress,
        businessType,
        countryCode,
        phoneNumber,
        storeLocation,
      }),
    });
    const data = await res.json();
    if (data.success) {
      router.push("/auth/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-lg">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            ScratchX
          </h1>
        </header>
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Tell us about your store</h1>
          <p className={styles.subtitle}>
            Set up your store to start creating campaigns.
          </p>
        </div>
        <form
          className={styles.form}
          onSubmit={(e) => {
            handleRegister(e);
          }}
        >
          <div className={styles.inputGroup}>
            <label className={styles.label}>Your Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Your full name"
              required
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Store Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Your store name"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Business Type</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                required
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option>Select type</option>
                <option>Retail</option>
                <option>Food & Beverage</option>
                <option>Services</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Contact Number</label>
            <div className={styles.phoneInputContainer}>
              <select
                className={styles.countrySelect}
                onChange={(e) => setCountryCode(e.target.value)}
                value={countryCode}
                required
              >
                <option>+91</option>
                <option>+1</option>
                <option>+44</option>
              </select>
              <input
                type="tel"
                className={styles.phoneInput}
                placeholder="Your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="**********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>StoreAddress</label>
            <textarea
              type="text"
              className={styles.input}
              placeholder="Current store location"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Store Address</label>
            <textarea
              className={styles.textarea}
              placeholder="Current store location"
              value={storeLocation}
              onChange={(e) => setStoreLocation(e.target.value)}
              required
            ></textarea>

            <div className={styles.locationContainer}>
              <svg
                className={styles.locationIcon}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="6"
                  stroke="#000000"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="2" fill="#000000" />
                <path
                  d="M12 2V5"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 19V22"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M2 12H5"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M19 12H22"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className={styles.locationTextContainer}>
                <span className={styles.locationTitle}>
                  Use your current location
                </span>
                <span className={styles.locationSubtitle}>
                  Current location name
                </span>
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitButton}>
            Finish Setup & Continue
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
