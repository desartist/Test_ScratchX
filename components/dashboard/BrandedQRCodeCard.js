"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "react-qr-code";
import { Download, Loader2, AlertCircle, Upload } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./BrandedQRCodeCard.module.css";

export default function BrandedQRCodeCard({
  campaignId,
  campaignStatus,
  campaignName,
  onDownload,
}) {
  const { account } = useAuthContext();
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Branding options
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#010f44");
  const [secondaryColor, setSecondaryColor] = useState("#ef9e1b");
  const [showCustomization, setShowCustomization] = useState(false);

  const qrContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (campaignStatus !== "active") {
      setLoading(false);
      return;
    }

    const generateQRData = async () => {
      try {
        if (!account?.id) return;

        // Generate absolute URL for QR code scanning
        const baseUrl =
          typeof window !== "undefined"
            ? `${window.location.protocol}//${window.location.host}`
            : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Create a canvas to draw the QR code with branding
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas size (larger for better quality)
      const size = 600;
      canvas.width = size;
      canvas.height = size;

      // Fill background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);

      // Get QR SVG
      const qrSvg = document.getElementById(`qr-branded-${campaignId}`);
      if (!qrSvg) return;

      const svgData = new XMLSerializer().serializeToString(qrSvg);
      const img = new Image();

      img.onload = () => {
        // Draw QR code
        ctx.drawImage(img, 0, 0, size, size);

        // Draw logo if exists
        if (logoUrl) {
          const logoImg = new Image();
          logoImg.onload = () => {
            // Logo size (about 25% of QR code)
            const logoSize = size * 0.25;
            const logoPadding = (size - logoSize) / 2;

            // Draw white background for logo
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoSize / 2 + 8, 0, 2 * Math.PI);
            ctx.fill();

            // Draw colored circle border
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw logo
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoSize / 2, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(
              logoImg,
              size / 2 - logoSize / 2,
              size / 2 - logoSize / 2,
              logoSize,
              logoSize,
            );
            ctx.restore();
          };
          logoImg.src = logoUrl;
        }

        // Download
        setTimeout(() => {
          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = `${campaignName || "campaign"}-qr-branded.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setDownloading(false);
        }, 100);
      };

      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch (err) {
      setError("Failed to download QR code");
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
        {/* <h3 className={styles.title}>Campaign QR Code</h3> */}
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
        <>
          <div className={styles.qrSection}>
            {/* QR Code Display */}
            <div
              className={styles.qrDisplay}
              ref={qrContainerRef}
              style={{
                "--primary-color": primaryColor,
                "--secondary-color": secondaryColor,
              }}
            >
              <div className={styles.qrBackground}>
                <QRCode
                  id={`qr-branded-${campaignId}`}
                  value={qrCode}
                  size={250}
                  level="H"
                  includeMargin={true}
                  fgColor={primaryColor}
                  bgColor="white"
                />

                {/* Logo Overlay */}
                {logoUrl && (
                  <div className={styles.logoContainer}>
                    <div
                      className={styles.logoBorder}
                      style={{ borderColor: secondaryColor }}
                    >
                      <img
                        src={logoUrl}
                        alt="Brand Logo"
                        className={styles.logoImage}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Download Button */}
            <button
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={downloading}
              title="Download branded QR code as PNG"
            >
              <Download size={14} />
              {downloading ? "Downloading..." : "Download QR"}
            </button>
          </div>

          {/* Customization Toggle */}
          <div className={styles.customizationToggle}>
            <button
              className={styles.toggleBtn}
              onClick={() => setShowCustomization(!showCustomization)}
            >
              {showCustomization ? "Hide" : "Customize"} Branding
            </button>
          </div>

          {/* Customization Panel */}
          {showCustomization && (
            <div className={styles.customizationPanel}>
              <div className={styles.customSection}>
                <h4>Brand Logo</h4>
                <div className={styles.logoUpload}>
                  <button
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} />
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: "none" }}
                  />
                  {logoUrl && (
                    <button
                      className={styles.clearLogoBtn}
                      onClick={() => {
                        setLogoUrl(null);
                        setLogoFile(null);
                      }}
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                <p className={styles.hint}>
                  Recommended: Square image (PNG/JPG)
                </p>
              </div>

              <div className={styles.customSection}>
                <h4>QR Code Color</h4>
                <div className={styles.colorInput}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    title="QR Code Pattern Color"
                  />
                  <span>{primaryColor}</span>
                </div>
              </div>

              <div className={styles.customSection}>
                <h4>Logo Border Color</h4>
                <div className={styles.colorInput}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    title="Logo Border Color"
                  />
                  <span>{secondaryColor}</span>
                </div>
              </div>

              <div className={styles.previewNote}>
                💡 Customize your branding and download the branded QR code
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
