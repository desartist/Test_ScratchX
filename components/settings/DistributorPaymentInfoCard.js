"use client";
import React, { useEffect, useState } from "react";
import styles from "./DistributorPaymentInfoCard.module.css";

// Merchant-only card — shows the payment details their managing Distributor
// has set up (bank transfer, UPI, and/or a QR code), so the retailer or
// wholesaler can pay them directly. Read-only; hides itself entirely if the
// distributor hasn't added anything yet.
export default function DistributorPaymentInfoCard() {
  const [loading, setLoading] = useState(true);
  const [distributorName, setDistributorName] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/merchant/distributor-payment-details", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setPaymentDetails(json.paymentDetails || null);
          setDistributorName(json.distributorName || null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasDetails =
    paymentDetails?.accountNumber ||
    paymentDetails?.upiId ||
    paymentDetails?.qrCodeImage;

  if (loading || !hasDetails) return null;

  return (
    <div className={styles.card}>
      <h3>Pay Your Distributor{distributorName ? ` — ${distributorName}` : ""}</h3>
      <div className={styles.viewMode}>
        {paymentDetails?.accountHolderName && (
          <div className={styles.infoItem}>
            <span className={styles.label}>Account Holder</span>
            <span className={styles.value}>{paymentDetails.accountHolderName}</span>
          </div>
        )}
        {paymentDetails?.accountNumber && (
          <div className={styles.infoItem}>
            <span className={styles.label}>Account Number</span>
            <span className={styles.value}>{paymentDetails.accountNumber}</span>
          </div>
        )}
        {paymentDetails?.ifscCode && (
          <div className={styles.infoItem}>
            <span className={styles.label}>IFSC Code</span>
            <span className={styles.value}>{paymentDetails.ifscCode}</span>
          </div>
        )}
        {paymentDetails?.upiId && (
          <div className={styles.infoItem}>
            <span className={styles.label}>UPI ID</span>
            <span className={styles.value}>{paymentDetails.upiId}</span>
          </div>
        )}
        {paymentDetails?.qrCodeImage && (
          <div className={styles.qrRow}>
            <span className={styles.label}>Scan to Pay</span>
            <img src={paymentDetails.qrCodeImage} alt="Distributor payment QR code" className={styles.qrImage} />
          </div>
        )}
      </div>
    </div>
  );
}
