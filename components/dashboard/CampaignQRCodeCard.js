"use client";

import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./CampaignQRCodeCard.module.css";

export default function CampaignQRCodeCard({
  campaignId,
  campaignStatus,
  onDownload,
}) {
  const { account } = useAuthContext();
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (campaignStatus !== "active") {
      setLoading(false);
      return;
    }

    const generateQRData = async () => {
      try {
        if (!account?.id) return;

        // Generate absolute URL for QR code scanning (mobile redirect)
        const baseUrl = typeof window !== 'undefined'
          ? `${window.location.protocol}//${window.location.host}`
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const absoluteUrl = `${baseUrl}/scan/${campaignId}`;
        setQrCode(absoluteUrl);
      } catch (err) {
        setError("Failed to generate QR code");
      } finally {
        setLoading(false);
      }
    };

    generateQRData();
  }, [campaignId, campaignStatus, account]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      if (onDownload) {
        await onDownload();
      } else {
        // Default download behavior
        const svg = document.getElementById(`qr-${campaignId}`);
        if (!svg) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = `campaign-${campaignId}-qr.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
      }
    } catch (err) {
      setError("Failed to download QR code");
    } finally {
      setDownloading(false);
    }
  };

  // Not active - don't show
  if (campaignStatus !== "active") {
    return null;
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Campaign QR Code</h3>
        <span className={styles.badge}>Generated</span>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <p>Generating QR code...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      ) : qrCode ? (
        <div className={styles.qrSection}>
          <div className={styles.qrDisplay}>
            <QRCode
              id={`qr-${campaignId}`}
              value={qrCode}
              size={150}
              level="H"
              includeMargin={true}
            />
          </div>

          <button
            className={styles.downloadBtn}
            onClick={handleDownload}
            disabled={downloading}
            title="Download QR code as PNG"
          >
            <Download size={14} />
            {downloading ? "Downloading..." : "Download QR"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
