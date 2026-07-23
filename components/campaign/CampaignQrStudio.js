"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Download,
  Copy,
  Check,
  ImagePlus,
  Trash2,
  Palette,
  Save,
} from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./CampaignQrStudio.module.css";

/**
 * CampaignQrStudio
 *
 * A customizable QR "studio" for a campaign's customer scan URL.
 * - Live editable foreground/background colors.
 * - Optional center brand logo (drawn over the QR; error-correction 'H'
 *   keeps it scannable).
 * - Optional brand name rendered above the QR and included in exports.
 * - Download as PNG / JPG / SVG.
 *
 * Props:
 *  - campaignId: string
 *  - defaultBrandName: string (store/merchant name; optional)
 *  - initialStyle: object|null (prefill fgColor/bgColor/brandName/logoUrl from
 *    a previously saved campaign.qrStyle)
 *  - persist: boolean (default false) — when true, render a "Save Changes"
 *    button that PUTs the current style to the campaign.
 *
 * SSR-safe: the scan URL is computed in an effect from
 * window.location.origin (never read at module/render top-level).
 */
const QR_SIZE = 320;
const QR_MARGIN = 2;
const LOGO_RATIO = 0.22;

export default function CampaignQrStudio({
  campaignId,
  defaultBrandName,
  initialStyle,
  persist = false,
  storeName,
  campaignName,
  startDate,
  endDate,
}) {
  const canvasRef = useRef(null);
  const { account } = useAuthContext();

  // Format date to "30 july 2026"
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
    const day = d.getDate();
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const dateRange =
    startDate && endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : "";

  // Read the origin once, client-only, via a lazy initializer (never at
  // module/render top-level; returns "" during SSR so markup is stable).
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  // Lazy initializers prefill from a saved style without a set-state-in-effect.
  const [brandName, setBrandName] = useState(
    () => initialStyle?.brandName || defaultBrandName || "",
  );
  const [fgColor, setFgColor] = useState(
    () => initialStyle?.fgColor || "#010f44",
  );
  const [bgColor, setBgColor] = useState(
    () => initialStyle?.bgColor || "#ffffff",
  );
  const [logoSrc, setLogoSrc] = useState(() => initialStyle?.logoUrl || "/Logo.webp");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const scanUrl = origin && campaignId ? `${origin}/scan/${campaignId}` : "";

  // Render the QR to the live preview canvas whenever inputs change.
  // Uses a cancelled flag so a stale logo load can't draw over a newer render.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scanUrl) return undefined;

    let cancelled = false;

    async function render() {
      try {
        await QRCode.toCanvas(canvas, scanUrl, {
          errorCorrectionLevel: "H",
          margin: QR_MARGIN,
          width: QR_SIZE,
          color: { dark: fgColor, light: bgColor },
        });
      } catch {
        return;
      }
      if (cancelled) return;
      if (!logoSrc) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const size = canvas.width * LOGO_RATIO;
        const pad = size * 0.16;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        // White rounded padding box behind the logo for contrast.
        ctx.fillStyle = bgColor || "#ffffff";
        drawRoundedRect(
          ctx,
          x - pad,
          y - pad,
          size + pad * 2,
          size + pad * 2,
          pad,
        );
        ctx.fill();
        ctx.drawImage(img, x, y, size, size);
      };
      img.src = logoSrc;
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [scanUrl, fgColor, bgColor, logoSrc]);

  const handleBrandNameChange = useCallback((e) => {
    setBrandName(e.target.value);
  }, []);

  const handleFgChange = useCallback((e) => {
    setFgColor(e.target.value);
  }, []);

  const handleBgChange = useCallback((e) => {
    setBgColor(e.target.value);
  }, []);

  const handleLogoChange = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoSrc(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveLogo = useCallback(() => {
    setLogoSrc("");
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!scanUrl || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }, [scanUrl]);

  const handleSave = useCallback(async () => {
    if (!campaignId || saving) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/qr-style`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": account?.id || "",
          "x-user-role": account?.role || "Merchant",
        },
        body: JSON.stringify({
          fgColor,
          bgColor,
          brandName: brandName.trim(),
          logoUrl: logoSrc || null,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.success) {
        setSaveError(
          (data && data.message) || "Failed to save. Please try again.",
        );
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [campaignId, saving, account, fgColor, bgColor, brandName, logoSrc]);

  // Build a composite export canvas: [logo] [store name] [QR] [campaign details]
  // Returns null if the live canvas isn't ready. Resolves once the logo has been drawn.
  const buildExportCanvas = useCallback(() => {
    return new Promise((resolve) => {
      const src = canvasRef.current;
      if (!src) {
        resolve(null);
        return;
      }

      const padding = 28;
      const LOGO_HEADER_H = 48;
      const STORE_NAME_H = storeName ? 50 : 0;
      const DETAILS_SECTION_H = (campaignName || dateRange) ? 90 : 0;

      const out = document.createElement("canvas");
      out.width = src.width + padding * 2;
      out.height = src.height + LOGO_HEADER_H + STORE_NAME_H + DETAILS_SECTION_H + padding * 3;

      const ctx = out.getContext("2d");
      if (!ctx) {
        resolve(out);
        return;
      }

      // Background
      ctx.fillStyle = bgColor || "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);

      let currentY = padding;

      // Draw ScratchX horizontal logo
      const logoImg = new Image();
      logoImg.onload = () => {
        const logoH = 28;
        const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
        const logoX = (out.width - logoW) / 2;
        ctx.drawImage(logoImg, logoX, currentY, logoW, logoH);
        currentY += LOGO_HEADER_H;

        // Draw store name
        if (storeName) {
          ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillStyle = "#010f44";
          ctx.textAlign = "center";
          ctx.fillText(storeName, out.width / 2, currentY + 28);
          currentY += STORE_NAME_H;
        }

        // Draw QR code
        currentY += padding / 2;
        ctx.drawImage(src, padding, currentY);
        currentY += src.height + padding;

        // Draw campaign details box
        if (campaignName || dateRange) {
          const detailsX = padding;
          const detailsY = currentY;
          const detailsW = out.width - padding * 2;
          const detailsH = DETAILS_SECTION_H - padding / 2;

          // Details background
          ctx.fillStyle = "#fef8f1";
          ctx.strokeStyle = "#f2dcc0";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(detailsX, detailsY, detailsW, detailsH, 12);
          ctx.fill();
          ctx.stroke();

          let detailsTextY = detailsY + 28;

          // Campaign name
          if (campaignName) {
            ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillStyle = "#010f44";
            ctx.textAlign = "center";
            ctx.fillText(campaignName, out.width / 2, detailsTextY);
            detailsTextY += 32;
          }

          // Date range
          if (dateRange) {
            ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillStyle = "#ef9e1b";
            ctx.textAlign = "center";
            ctx.fillText(dateRange, out.width / 2, detailsTextY);
          }
        }

        resolve(out);
      };
      logoImg.onerror = () => resolve(out);
      logoImg.src = "/horizontal_logo.webp";
    });
  }, [bgColor, storeName, campaignName, dateRange]);

  const triggerDownload = useCallback((href, filename, revoke) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) URL.revokeObjectURL(href);
  }, []);

  const fileBase = (campaignId || "campaign").toString();

  const handleDownloadPng = useCallback(async () => {
    const out = await buildExportCanvas();
    if (!out) return;
    triggerDownload(out.toDataURL("image/png"), `${fileBase}-qr.png`);
  }, [buildExportCanvas, triggerDownload, fileBase]);

  const handleDownloadJpg = useCallback(async () => {
    const out = await buildExportCanvas();
    if (!out) return;
    // The export canvas already has an opaque bg fill, so JPEG is safe.
    triggerDownload(out.toDataURL("image/jpeg", 0.92), `${fileBase}-qr.jpg`);
  }, [buildExportCanvas, triggerDownload, fileBase]);

  const handleDownloadSvg = useCallback(async () => {
    if (!scanUrl) return;
    let qrSvg;
    try {
      qrSvg = await QRCode.toString(scanUrl, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: QR_MARGIN,
        color: { dark: fgColor, light: bgColor },
      });
    } catch {
      return;
    }

    const padding = 28;
    const LOGO_HEADER_H = 48;
    const STORE_NAME_H = storeName ? 50 : 0;
    const DETAILS_SECTION_H = (campaignName || dateRange) ? 90 : 0;
    const qrBox = QR_SIZE;
    const outW = qrBox + padding * 2;
    const outH = qrBox + LOGO_HEADER_H + STORE_NAME_H + DETAILS_SECTION_H + padding * 3;
    const qrY = padding + LOGO_HEADER_H + STORE_NAME_H;

    // Re-scale the inner QR svg to QR_SIZE via a nested viewport.
    const inner = qrSvg
      .replace(/^<\?xml[^>]*\?>/, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "");

    let logoMarkup = "";
    if (logoSrc) {
      const lSize = qrBox * LOGO_RATIO;
      const lPad = lSize * 0.16;
      const lx = padding + (qrBox - lSize) / 2;
      const ly = qrY + (qrBox - lSize) / 2;
      logoMarkup =
        `<rect x="${lx - lPad}" y="${ly - lPad}" width="${lSize + lPad * 2}" ` +
        `height="${lSize + lPad * 2}" rx="${lPad}" fill="${escapeXml(bgColor || "#ffffff")}"/>` +
        `<image href="${escapeXml(logoSrc)}" x="${lx}" y="${ly}" ` +
        `width="${lSize}" height="${lSize}"/>`;
    }

    // ScratchX horizontal logo above the QR.
    const headerLogoH = 28;
    const headerLogoW = 120;
    const headerLogoX = (outW - headerLogoW) / 2;
    const headerLogoY = padding + (LOGO_HEADER_H - headerLogoH) / 2;
    const headerMarkup =
      `<image href="/horizontal_logo.webp" x="${headerLogoX}" y="${headerLogoY}" ` +
      `width="${headerLogoW}" height="${headerLogoH}"/>`;

    // Build store name markup
    let storeNameMarkup = "";
    if (storeName) {
      const storeNameY = padding + LOGO_HEADER_H + 28;
      storeNameMarkup =
        `<text x="${outW / 2}" y="${storeNameY}" font-size="24" font-weight="bold" ` +
        `text-anchor="middle" fill="#010f44" font-family="system-ui, sans-serif">${escapeXml(storeName)}</text>`;
    }

    // Build campaign details markup
    let detailsMarkup = "";
    if (campaignName || dateRange) {
      const detailsX = padding;
      const detailsY = qrY + qrBox + padding;
      const detailsW = outW - padding * 2;
      const detailsH = DETAILS_SECTION_H - padding / 2;

      detailsMarkup =
        `<rect x="${detailsX}" y="${detailsY}" width="${detailsW}" height="${detailsH}" ` +
        `rx="12" fill="#fef8f1" stroke="#f2dcc0" stroke-width="2"/>`;

      let detailsTextY = detailsY + 28;

      if (campaignName) {
        detailsMarkup +=
          `<text x="${outW / 2}" y="${detailsTextY}" font-size="20" font-weight="bold" ` +
          `text-anchor="middle" fill="#010f44" font-family="system-ui, sans-serif">${escapeXml(campaignName)}</text>`;
        detailsTextY += 32;
      }

      if (dateRange) {
        detailsMarkup +=
          `<text x="${outW / 2}" y="${detailsTextY}" font-size="16" font-weight="bold" ` +
          `text-anchor="middle" fill="#ef9e1b" font-family="system-ui, sans-serif">${escapeXml(dateRange)}</text>`;
      }
    }

    const svgString =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" ` +
      `viewBox="0 0 ${outW} ${outH}">` +
      `<defs><style>text { font-family: system-ui, -apple-system, sans-serif; }</style></defs>` +
      `<rect width="${outW}" height="${outH}" fill="${escapeXml(bgColor || "#ffffff")}"/>` +
      headerMarkup +
      storeNameMarkup +
      `<svg x="${padding}" y="${qrY}" width="${qrBox}" height="${qrBox}" ` +
      `viewBox="0 0 ${qrBox} ${qrBox}" preserveAspectRatio="xMidYMid meet">${inner}</svg>` +
      logoMarkup +
      detailsMarkup +
      `</svg>`;

    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${fileBase}-qr.svg`, true);
  }, [scanUrl, bgColor, fgColor, logoSrc, storeName, campaignName, dateRange, triggerDownload, fileBase]);

  return (
    <div className={styles.studio}>
      {/* Preview */}
      <div className={styles.previewCol}>
        <div className={styles.previewCard}>
          <img
            src="/horizontal_logo.webp"
            alt="ScratchX"
            className={styles.brandLogo}
          />

          {/* Store Name Above QR */}
          {storeName && (
            <div className={styles.storeNameContainer}>
              <h3 className={styles.storeName}>{storeName}</h3>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={QR_SIZE}
            height={QR_SIZE}
            className={styles.canvas}
            aria-label="Campaign QR code preview"
          />

          {/* Campaign Details Below QR */}
          <div className={styles.campaignDetailsContainer}>
            {campaignName && (
              <h4 className={styles.campaignName}>{campaignName}</h4>
            )}
            {dateRange && (
              <p className={styles.dateRange}>{dateRange}</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controlsCol}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="qr-brand-name">
            Brand name
          </label>
          <input
            id="qr-brand-name"
            type="text"
            className={styles.textInput}
            value={brandName}
            onChange={handleBrandNameChange}
            placeholder="Shown above the QR"
          />
        </div>

        <div className={styles.colorRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="qr-fg">
              <Palette size={14} /> QR color
            </label>
            <input
              id="qr-fg"
              type="color"
              className={styles.colorInput}
              value={fgColor}
              onChange={handleFgChange}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="qr-bg">
              <Palette size={14} /> Background
            </label>
            <input
              id="qr-bg"
              type="color"
              className={styles.colorInput}
              value={bgColor}
              onChange={handleBgChange}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="qr-logo">
            Center logo
          </label>
          <div className={styles.logoRow}>
            <label className={styles.fileButton} htmlFor="qr-logo">
              <ImagePlus size={16} />
              {logoSrc ? "Change logo" : "Upload logo"}
            </label>
            <input
              id="qr-logo"
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleLogoChange}
            />
            {logoSrc && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={handleRemoveLogo}
              >
                <Trash2 size={16} />
                Remove logo
              </button>
            )}
          </div>
        </div>

        <div className={styles.downloadRow}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleDownloadPng}
          >
            <Download size={16} />
            PNG
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleDownloadJpg}
          >
            <Download size={16} />
            JPG
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleDownloadSvg}
          >
            <Download size={16} />
            SVG
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleCopyLink}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {persist && (
          <div className={styles.saveRow}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
            </button>
            {saveError && <p className={styles.saveError}>{saveError}</p>}
          </div>
        )}

        <p className={styles.tip}>
          Tip: high-contrast colors and a small logo keep the QR scannable.
        </p>
      </div>
    </div>
  );
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
