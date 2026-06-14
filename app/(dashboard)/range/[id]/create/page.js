"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./page.module.css";
import { useParams, useRouter } from "next/navigation";

export default function CreateRangePage() {
  const { id } = useParams();
  const router = useRouter();
  console.log(id, "id");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [coupons, setCoupons] = useState([
    { id: 1, type: "Fixed Amount", value: "" },
    { id: 2, type: "Percentage", value: "" },
    { id: 3, type: "Gift", value: "" },
    { id: 4, type: "Fixed Amount", value: "" },
    { id: 5, type: "Fixed Amount", value: "" },
    { id: 6, type: "Fixed Amount", value: "" },
  ]);

  const handleCouponChange = (index, field, val) => {
    const updatedCoupons = [...coupons];
    updatedCoupons[index][field] = val;
    setCoupons(updatedCoupons);
  };

  const getLabelForType = (type) => {
    switch (type) {
      case "Percentage":
        return "Reward Percentage (%)";
      case "Gift":
        return "Reward Gift";
      case "Fixed Amount":
      default:
        return "Reward Amount (₹)";
    }
  };

  const getPlaceholderForType = (type) => {
    switch (type) {
      case "Percentage":
        return "e.g. 7";
      case "Gift":
        return "e.g. 7";
      case "Fixed Amount":
      default:
        return "e.g. 5";
    }
  };

  async function handleSubmit() {
    const res = await fetch("/api/campaign_range", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        minAmount,
        maxAmount,
        rewards: coupons,
        campaignId: id,
        rangeId: null,
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to create range");
    }
    const data = await res.json();
    console.log(data);
    router.push(`/range/${id}`);
    return data;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Range 1</h1>

      <div className={styles.row}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Min. Amount (₹)</label>
          <input
            type="number"
            className={styles.input}
            placeholder="e.g. 0"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Max Amount (₹)</label>
          <input
            type="number"
            className={styles.input}
            placeholder="e.g. 499"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
          />
        </div>
      </div>

      <div>
        <h2 className={styles.sectionTitle}>Set Reward Cards</h2>
        <p className={styles.sectionSubtitle}>
          Customers will receive one of these rewards after scratching
        </p>

        <div className={styles.couponList}>
          {coupons.map((coupon, index) => (
            <div key={coupon.id} className={styles.couponCard}>
              <h3 className={styles.couponTitle}>Coupon {index + 1}</h3>
              <div className={styles.row} style={{ marginBottom: 0 }}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Reward Type</label>
                  <div className={styles.selectWrapper}>
                    <select
                      className={styles.select}
                      value={coupon.type}
                      onChange={(e) =>
                        handleCouponChange(index, "type", e.target.value)
                      }
                    >
                      <option value="Fixed Amount">Fixed Amount</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Gift">Gift</option>
                    </select>
                    <ChevronDown
                      size={16}
                      color="#888"
                      className={styles.selectIcon}
                    />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    {getLabelForType(coupon.type)}
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={getPlaceholderForType(coupon.type)}
                    value={coupon.value}
                    onChange={(e) =>
                      handleCouponChange(index, "value", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.saveBtn} onClick={() => handleSubmit()}>
          Save & Continue
        </button>
      </div>
    </div>
  );
}
